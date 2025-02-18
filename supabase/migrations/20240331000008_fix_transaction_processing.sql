-- Drop existing functions to ensure clean slate
DROP FUNCTION IF EXISTS approve_usd_balance_order(UUID, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL, DECIMAL);

-- Function to approve USD balance order with enhanced logging
CREATE OR REPLACE FUNCTION approve_usd_balance_order(
  p_transaction_id UUID,
  p_price_per_token DECIMAL,
  p_pool_main_asset_price DECIMAL DEFAULT NULL
) RETURNS jsonb AS $$
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
  v_debug_transaction RECORD;
BEGIN
  -- Enhanced logging at start
  RAISE NOTICE 'Starting approve_usd_balance_order for transaction_id: %', p_transaction_id;
  
  -- Debug query to see raw transaction data
  SELECT t.*, a.type as asset_type, a.symbol as asset_symbol 
  INTO v_debug_transaction
  FROM transactions t
  LEFT JOIN assets a ON t.asset_id = a.id
  WHERE t.id = p_transaction_id;
  
  RAISE NOTICE 'Debug transaction data: id=%, status=%, type=%, asset_type=%, asset_symbol=%',
    v_debug_transaction.id,
    v_debug_transaction.status,
    v_debug_transaction.type,
    v_debug_transaction.asset_type,
    v_debug_transaction.asset_symbol;

  -- Get USD asset ID
  SELECT id INTO v_usd_asset_id
  FROM assets
  WHERE symbol = 'USD';
  
  RAISE NOTICE 'USD asset ID: %', v_usd_asset_id;

  -- Get transaction details with explicit locking
  SELECT t.* INTO v_transaction
  FROM transactions t
  WHERE t.id = p_transaction_id 
  AND t.status = 'pending'
  FOR UPDATE NOWAIT;  -- Added NOWAIT to fail fast if locked

  -- Enhanced error handling for transaction lookup
  IF v_transaction.id IS NULL THEN
    -- Check if transaction exists at all
    IF v_debug_transaction.id IS NULL THEN
      RAISE NOTICE 'Transaction % does not exist in the database', p_transaction_id;
      RAISE EXCEPTION 'Transaction not found';
    ELSE
      RAISE NOTICE 'Transaction exists but status is: % (expected: pending)', v_debug_transaction.status;
      RAISE EXCEPTION 'Transaction % not in pending status. Current status: %', 
        p_transaction_id, 
        v_debug_transaction.status;
    END IF;
  END IF;

  RAISE NOTICE 'Transaction found and locked: % (status: %)', v_transaction.id, v_transaction.status;

  -- Get if this is a commodity transaction
  v_is_commodity := (v_transaction.metadata->>'is_commodity')::BOOLEAN;
  
  -- Get the USD amount from metadata
  v_usd_amount := (v_transaction.metadata->>'usd_amount')::DECIMAL;
  IF v_usd_amount IS NULL THEN
    RAISE NOTICE 'USD amount not found in metadata: %', v_transaction.metadata;
    RAISE EXCEPTION 'USD amount not found in transaction metadata';
  END IF;

  RAISE NOTICE 'Transaction details: is_commodity=%, usd_amount=%', v_is_commodity, v_usd_amount;

  -- Calculate fee (0.5% of USD amount)
  v_fee := v_usd_amount * 0.005;
  
  -- Calculate total payment including fee
  v_total_to_pay := v_usd_amount + v_fee;
  
  -- Calculate token amount based on USD amount and admin price
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
    (v_transaction.metadata->>'pool_id')::UUID
  INTO 
    v_asset_type,
    v_pool_id
  FROM assets a
  WHERE a.id = v_transaction.asset_id;

  -- Verify USD balance
  IF v_initial_usd_balance < v_total_to_pay THEN
    RAISE EXCEPTION 'Insufficient USD balance. Required: %, Available: %', 
      v_total_to_pay, v_initial_usd_balance;
  END IF;

  -- Start transaction processing
  BEGIN
    -- Decrease USD balance
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

      -- Get pool's main asset
      SELECT main_asset_id INTO v_pool_main_asset_id
      FROM pools
      WHERE id = v_pool_id;

      -- Verify pool main asset price was provided
      IF p_pool_main_asset_price IS NULL THEN
        RAISE EXCEPTION 'Pool main asset price is required for pool transactions';
      END IF;

      -- Calculate main asset amount
      v_pool_main_asset_amount := v_total_to_pay / p_pool_main_asset_price;

      RAISE NOTICE 'Pool calculations: main_asset_amount=%, main_asset_price=%', 
        v_pool_main_asset_amount, p_pool_main_asset_price;

      -- Update pool balances
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

    -- Add purchased asset to user's balance
    INSERT INTO user_balances (
      user_id, 
      asset_id, 
      balance,
      created_at,
      updated_at,
      last_transaction_at
    ) VALUES (
      v_transaction.user_id,
      v_transaction.asset_id,
      v_token_amount,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, asset_id) DO UPDATE 
    SET 
      balance = user_balances.balance + v_token_amount,
      updated_at = NOW(),
      last_transaction_at = NOW();

    -- Update transaction status
    UPDATE transactions
    SET 
      status = 'completed',
      completed_at = NOW(),
      price_per_token = p_price_per_token,
      amount = v_token_amount,
      metadata = jsonb_set(
        jsonb_set(
          jsonb_set(
            metadata,
            '{final_token_amount}',
            to_jsonb(v_token_amount)
          ),
          '{final_usd_amount}',
          to_jsonb(v_usd_amount)
        ),
        '{final_total_paid}',
        to_jsonb(v_total_to_pay)
      )
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    -- Return transaction details as jsonb
    RETURN jsonb_build_object(
      'id', v_transaction.id,
      'user_id', v_transaction.user_id,
      'asset_id', v_transaction.asset_id,
      'type', v_transaction.type,
      'amount', v_transaction.amount,
      'price_per_token', v_transaction.price_per_token,
      'status', v_transaction.status,
      'metadata', v_transaction.metadata
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error in transaction: % %', SQLERRM, SQLSTATE;
      RAISE EXCEPTION 'Failed to process transaction: % %', SQLERRM, SQLSTATE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to process buy transactions (simplified version)
CREATE OR REPLACE FUNCTION process_buy_transaction(
  p_transaction_id UUID,
  p_pool_id UUID,
  p_price_per_token DECIMAL,
  p_amount DECIMAL,
  p_pool_main_asset_price DECIMAL DEFAULT NULL
) RETURNS jsonb AS $$
BEGIN
  -- Simply call approve_usd_balance_order with the same parameters
  RETURN approve_usd_balance_order(p_transaction_id, p_price_per_token, p_pool_main_asset_price);
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION approve_usd_balance_order(UUID, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL, DECIMAL) TO authenticated; 