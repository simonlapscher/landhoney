-- Drop existing functions
DROP FUNCTION IF EXISTS create_usd_balance_order(UUID, UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS approve_usd_balance_order(UUID, DECIMAL);
DROP FUNCTION IF EXISTS process_usd_balance_purchase(UUID, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL);

-- Function to create a USD balance order
CREATE OR REPLACE FUNCTION create_usd_balance_order(
  p_user_id UUID,
  p_asset_id UUID,
  p_amount DECIMAL,  -- This represents USD amount for commodities/pool assets, token amount for direct debt assets
  p_price_per_token DECIMAL,
  p_fee DECIMAL,
  p_total_to_pay DECIMAL
) RETURNS transactions AS $$
DECLARE
  v_usd_asset_id UUID;
  v_usd_balance DECIMAL;
  v_transaction transactions;
  v_asset_type TEXT;
  v_pool_id UUID;
BEGIN
  -- Get USD asset ID
  SELECT id INTO v_usd_asset_id
  FROM assets
  WHERE symbol = 'USD';

  -- Get user's USD balance
  SELECT balance INTO v_usd_balance
  FROM user_balances
  WHERE user_id = p_user_id AND asset_id = v_usd_asset_id;

  -- Get asset type and check if it's in a pool
  SELECT 
    a.type,
    (SELECT p.id 
     FROM pools p 
     JOIN pool_assets pa ON pa.pool_id = p.id 
     WHERE pa.asset_id = a.id 
     LIMIT 1) as pool_id
  INTO v_asset_type, v_pool_id
  FROM assets a
  WHERE a.id = p_asset_id;

  -- Verify sufficient balance
  IF v_usd_balance < p_total_to_pay THEN
    RAISE EXCEPTION 'Insufficient USD balance';
  END IF;

  -- For debt assets from direct offering (not in pool) or USD, create completed transaction
  IF (v_asset_type = 'debt' AND v_pool_id IS NULL) OR v_asset_type = 'cash' THEN
    INSERT INTO transactions (
      user_id,
      asset_id,
      type,
      amount,
      price_per_token,
      status,
      metadata,
      completed_at
    ) VALUES (
      p_user_id,
      p_asset_id,
      'buy',
      p_amount,  -- For direct offerings, this is already the token amount
      p_price_per_token,
      'completed',
      jsonb_build_object(
        'fee_usd', p_fee,
        'payment_method', 'usd_balance',
        'usd_amount', p_amount
      ),
      NOW()
    ) RETURNING * INTO v_transaction;

    -- Update balances immediately
    UPDATE user_balances
    SET 
      balance = balance - p_total_to_pay,
      updated_at = NOW(),
      last_transaction_at = NOW()
    WHERE user_id = p_user_id 
    AND asset_id = v_usd_asset_id;

    INSERT INTO user_balances (user_id, asset_id, balance)
    VALUES (p_user_id, p_asset_id, p_amount)
    ON CONFLICT (user_id, asset_id)
    DO UPDATE SET 
      balance = user_balances.balance + EXCLUDED.balance,
      updated_at = NOW(),
      last_transaction_at = NOW();

  -- For pool assets or commodities, create pending transaction
  ELSE
    INSERT INTO transactions (
      user_id,
      asset_id,
      type,
      amount,
      price_per_token,
      status,
      metadata
    ) VALUES (
      p_user_id,
      p_asset_id,
      'buy',
      p_amount,  -- Store USD amount for commodities
      p_price_per_token,
      'pending',
      jsonb_build_object(
        'fee_usd', p_fee,
        'payment_method', 'usd_balance',
        'pool_id', v_pool_id,
        'usd_amount', p_amount,  -- Store the USD amount user wants to spend
        'is_commodity', v_asset_type = 'commodity'  -- Flag to indicate if this is a commodity
      )
    ) RETURNING * INTO v_transaction;
  END IF;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- Function to approve USD balance order
CREATE OR REPLACE FUNCTION approve_usd_balance_order(
  p_transaction_id UUID,
  p_price_per_token DECIMAL,
  p_pool_main_asset_price DECIMAL DEFAULT NULL
) RETURNS transactions AS $$
DECLARE
  v_transaction transactions;
  v_usd_asset_id UUID;
  v_total_to_pay DECIMAL;
  v_pool_id UUID;
  v_pool_main_asset_id UUID;
  v_pool_main_asset_amount DECIMAL;
  v_asset_type TEXT;
  v_usd_amount DECIMAL;
  v_token_amount DECIMAL;
  v_is_commodity BOOLEAN;
  v_fee DECIMAL;
  v_initial_usd_balance DECIMAL;
  v_final_usd_balance DECIMAL;
BEGIN
  -- Get USD asset ID
  SELECT id INTO v_usd_asset_id
  FROM assets
  WHERE symbol = 'USD';

  RAISE NOTICE 'Starting approval process for transaction %', p_transaction_id;

  -- Get transaction details first
  SELECT t.* INTO v_transaction
  FROM transactions t
  WHERE t.id = p_transaction_id AND t.status = 'pending'
  FOR UPDATE;

  IF v_transaction.id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found or not in pending status';
  END IF;

  RAISE NOTICE 'Transaction found: % for user %', v_transaction.id, v_transaction.user_id;

  -- Get if this is a commodity transaction
  v_is_commodity := (v_transaction.metadata->>'is_commodity')::BOOLEAN;

  -- Get the USD amount from metadata
  v_usd_amount := (v_transaction.metadata->>'usd_amount')::DECIMAL;

  RAISE NOTICE 'Transaction details: is_commodity=%, usd_amount=%', v_is_commodity, v_usd_amount;

  -- Calculate fee (0.5% of USD amount)
  v_fee := v_usd_amount * 0.005;
  
  -- Calculate total payment including fee
  v_total_to_pay := v_usd_amount + v_fee;
  
  -- Calculate token amount based on USD amount (NOT including fee) and admin price
  v_token_amount := v_usd_amount / p_price_per_token;

  RAISE NOTICE 'Calculated amounts: fee=%, total_to_pay=%, token_amount=%', v_fee, v_total_to_pay, v_token_amount;

  -- Get current USD balance for logging
  SELECT balance INTO v_initial_usd_balance
  FROM user_balances 
  WHERE user_id = v_transaction.user_id 
  AND asset_id = v_usd_asset_id;

  RAISE NOTICE 'Initial USD balance: %', v_initial_usd_balance;

  -- Then get asset type and pool ID
  SELECT 
    a.type,
    (t.metadata->>'pool_id')::UUID
  INTO 
    v_asset_type,
    v_pool_id
  FROM transactions t
  JOIN assets a ON a.id = t.asset_id
  WHERE t.id = p_transaction_id;

  -- Verify USD balance
  IF NOT EXISTS (
    SELECT 1 FROM user_balances 
    WHERE user_id = v_transaction.user_id 
    AND asset_id = v_usd_asset_id
    AND balance >= v_total_to_pay
  ) THEN
    RAISE EXCEPTION 'Insufficient USD balance. Required: %, Available: %', v_total_to_pay, v_initial_usd_balance;
  END IF;

  -- Start transaction
  BEGIN
    -- Decrease USD balance by total amount (including fee)
    UPDATE user_balances
    SET 
      balance = balance - v_total_to_pay,
      updated_at = NOW(),
      last_transaction_at = NOW()
    WHERE user_id = v_transaction.user_id 
    AND asset_id = v_usd_asset_id;

    -- Get updated USD balance for logging
    SELECT balance INTO v_final_usd_balance
    FROM user_balances 
    WHERE user_id = v_transaction.user_id 
    AND asset_id = v_usd_asset_id;

    RAISE NOTICE 'USD balance after update: % (expected: %)', 
      v_final_usd_balance, 
      v_initial_usd_balance - v_total_to_pay;

    -- If this is a pool asset
    IF v_pool_id IS NOT NULL THEN
      RAISE NOTICE 'Processing pool asset transaction for pool %', v_pool_id;

      -- Get pool's main asset details
      SELECT 
        p.main_asset_id
      INTO 
        v_pool_main_asset_id
      FROM pools p
      WHERE p.id = v_pool_id;

      -- Verify pool main asset price was provided
      IF p_pool_main_asset_price IS NULL THEN
        RAISE EXCEPTION 'Pool main asset price is required for pool transactions';
      END IF;

      -- Calculate main asset amount using provided price (use total amount including fee)
      v_pool_main_asset_amount := v_total_to_pay / p_pool_main_asset_price;

      RAISE NOTICE 'Pool calculations: main_asset_amount=%, main_asset_price=%', 
        v_pool_main_asset_amount, p_pool_main_asset_price;

      -- Decrease pool's asset balance
      UPDATE pool_assets
      SET balance = balance - v_token_amount
      WHERE pool_id = v_pool_id 
      AND asset_id = v_transaction.asset_id;

      -- Update pool's main asset balance
      INSERT INTO pool_assets (pool_id, asset_id, balance)
      VALUES (v_pool_id, v_pool_main_asset_id, v_pool_main_asset_amount)
      ON CONFLICT (pool_id, asset_id)
      DO UPDATE SET balance = pool_assets.balance + v_pool_main_asset_amount;

      -- Update pool's TVL
      UPDATE pools
      SET total_value_locked = total_value_locked + v_total_to_pay
      WHERE id = v_pool_id;
    END IF;

    -- Increase user's asset balance with the token amount
    INSERT INTO user_balances (user_id, asset_id, balance)
    VALUES (v_transaction.user_id, v_transaction.asset_id, v_token_amount)
    ON CONFLICT (user_id, asset_id)
    DO UPDATE SET 
      balance = user_balances.balance + v_token_amount,
      updated_at = NOW(),
      last_transaction_at = NOW();

    -- Update transaction status
    UPDATE transactions
    SET 
      status = 'completed',
      completed_at = NOW(),
      price_per_token = p_price_per_token,
      amount = v_token_amount,  -- Update with final token amount
      metadata = jsonb_set(
        jsonb_set(
          jsonb_set(
            metadata,
            '{total_paid}',
            to_jsonb(v_total_to_pay)
          ),
          '{fee_usd}',
          to_jsonb(v_fee)
        ),
        '{pool_main_asset_price}',
        CASE WHEN p_pool_main_asset_price IS NOT NULL 
          THEN to_jsonb(p_pool_main_asset_price)
          ELSE metadata->'pool_main_asset_price'
        END
      )
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    -- Final balance check
    SELECT balance INTO v_final_usd_balance
    FROM user_balances 
    WHERE user_id = v_transaction.user_id 
    AND asset_id = v_usd_asset_id;

    RAISE NOTICE 'Transaction completed. Final USD balance: % (change: %)', 
      v_final_usd_balance, 
      v_final_usd_balance - v_initial_usd_balance;

    RETURN v_transaction;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error in transaction: % %', SQLERRM, SQLSTATE;
      RAISE EXCEPTION 'Failed to process USD balance order: % %', SQLERRM, SQLSTATE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to process buy transactions
CREATE OR REPLACE FUNCTION process_buy_transaction(
  p_transaction_id UUID,
  p_pool_id UUID,
  p_price_per_token DECIMAL,
  p_amount DECIMAL,
  p_pool_main_asset_price DECIMAL DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_transaction RECORD;
  v_pool RECORD;
  v_pool_main_asset_amount DECIMAL;
  v_total_to_pay DECIMAL;
BEGIN
  -- Get transaction details
  SELECT t.*, a.symbol INTO v_transaction
  FROM transactions t
  JOIN assets a ON a.id = t.asset_id
  WHERE t.id = p_transaction_id AND t.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or not in pending status';
  END IF;

  -- Get pool details if pool ID is provided
  IF p_pool_id IS NOT NULL THEN
    SELECT p.*, ma.price_per_token as main_asset_price 
    INTO v_pool
    FROM pools p
    JOIN assets ma ON ma.id = p.main_asset_id
    WHERE p.id = p_pool_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pool not found';
    END IF;

    -- Verify pool main asset price was provided
    IF p_pool_main_asset_price IS NULL THEN
      RAISE EXCEPTION 'Pool main asset price is required for pool transactions';
    END IF;

    -- Calculate total payment including fee
    v_total_to_pay := p_amount * 1.005; -- Include 0.5% fee

    -- Calculate main asset amount using provided price
    v_pool_main_asset_amount := v_total_to_pay / p_pool_main_asset_price;

    -- Update pool balances
    UPDATE pool_assets
    SET balance = balance - p_amount
    WHERE pool_id = p_pool_id 
    AND asset_id = v_transaction.asset_id;

    -- Add main asset to pool
    INSERT INTO pool_assets (pool_id, asset_id, balance)
    VALUES (p_pool_id, v_pool.main_asset_id, v_pool_main_asset_amount)
    ON CONFLICT (pool_id, asset_id)
    DO UPDATE SET balance = pool_assets.balance + v_pool_main_asset_amount;

    -- Update pool's TVL
    UPDATE pools
    SET total_value_locked = total_value_locked + v_total_to_pay
    WHERE id = p_pool_id;
  END IF;

  -- Update transaction status
  UPDATE transactions
  SET 
    status = 'completed',
    completed_at = NOW(),
    price_per_token = p_price_per_token,
    amount = p_amount,
    metadata = jsonb_set(
      jsonb_set(
        metadata,
        '{total_paid}',
        to_jsonb(v_total_to_pay)
      ),
      '{pool_main_asset_price}',
      CASE WHEN p_pool_main_asset_price IS NOT NULL 
        THEN to_jsonb(p_pool_main_asset_price)
        ELSE metadata->'pool_main_asset_price'
      END
    )
  WHERE id = p_transaction_id
  RETURNING * INTO v_transaction;

  -- Add to user's balance
  INSERT INTO user_balances (user_id, asset_id, balance)
  VALUES (v_transaction.user_id, v_transaction.asset_id, p_amount)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET balance = user_balances.balance + p_amount;

  RETURN row_to_json(v_transaction)::jsonb;
END;
$$ LANGUAGE plpgsql;

-- Update convert_pool_asset_to_usd to use admin-provided price
CREATE OR REPLACE FUNCTION convert_pool_asset_to_usd(
  p_pool_id UUID,
  p_asset_amount DECIMAL,
  p_price_per_token DECIMAL DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
  v_usd_value DECIMAL;
  v_asset_price DECIMAL;
BEGIN
  IF p_price_per_token IS NOT NULL THEN
    v_asset_price := p_price_per_token;
  ELSE
    -- Get the pool's main asset price as fallback
    SELECT a.price_per_token INTO v_asset_price
    FROM pools p
    JOIN assets a ON a.id = p.main_asset_id
    WHERE p.id = p_pool_id;
  END IF;

  -- Convert to USD
  v_usd_value := p_asset_amount * v_asset_price;
    
  RETURN v_usd_value;
END;
$$ LANGUAGE plpgsql; 