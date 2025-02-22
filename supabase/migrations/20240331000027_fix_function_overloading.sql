-- Drop all versions of the function
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, DECIMAL, DECIMAL, UUID);
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL, DECIMAL);

-- Recreate with single consistent signature
CREATE OR REPLACE FUNCTION process_buy_transaction(
  p_transaction_id UUID,
  p_price_per_token DECIMAL,
  p_pool_main_asset_price DECIMAL DEFAULT NULL,
  p_pool_id UUID DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_transaction RECORD;
  v_pool RECORD;
  v_asset RECORD;
  v_usd_asset_id UUID;
  v_pool_main_asset_amount DECIMAL;
  v_total_to_pay DECIMAL;
  v_fee DECIMAL;
  v_payment_method TEXT;
  v_user_balance DECIMAL;
  v_initial_pool_balance DECIMAL;
  v_is_pool_asset BOOLEAN;
BEGIN
  RAISE NOTICE 'Starting process_buy_transaction with transaction_id: %, price_per_token: %, pool_main_asset_price: %, pool_id: %', 
    p_transaction_id, p_price_per_token, p_pool_main_asset_price, p_pool_id;

  -- Get transaction details with asset info
  SELECT 
    t.*,
    a.symbol AS asset_symbol,
    a.type AS asset_type
  INTO v_transaction
  FROM transactions t
  JOIN assets a ON a.id = t.asset_id
  WHERE t.id = p_transaction_id 
  AND t.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or not in pending status';
  END IF;

  RAISE NOTICE 'Transaction found: user_id=%, asset_id=%, amount=%, type=%, symbol=%', 
    v_transaction.user_id, v_transaction.asset_id, v_transaction.amount, v_transaction.type, v_transaction.asset_symbol;

  -- Check if asset is in a pool
  v_is_pool_asset := is_asset_in_pool(v_transaction.asset_id);
  RAISE NOTICE 'Asset pool check: is_pool_asset=%', v_is_pool_asset;

  -- For pool assets, pool_id and pool_main_asset_price are required
  IF v_is_pool_asset AND (p_pool_id IS NULL OR p_pool_main_asset_price IS NULL) THEN
    RAISE EXCEPTION 'Pool ID and pool main asset price are required for pool asset transactions';
  END IF;

  -- Get USD asset ID for balance checks
  SELECT id INTO v_usd_asset_id
  FROM assets
  WHERE symbol = 'USD';
  
  RAISE NOTICE 'USD asset ID: %', v_usd_asset_id;

  -- Get payment method from metadata
  v_payment_method := v_transaction.metadata->>'payment_method';
  IF v_payment_method IS NULL THEN
    RAISE EXCEPTION 'Payment method not specified in transaction metadata';
  END IF;

  RAISE NOTICE 'Payment method: %', v_payment_method;

  -- Calculate fee (0.5%)
  v_fee := v_transaction.amount * p_price_per_token * 0.005;
  v_total_to_pay := (v_transaction.amount * p_price_per_token) + v_fee;

  RAISE NOTICE 'Payment calculation: amount=%, price=%, fee=%, total=%',
    v_transaction.amount, p_price_per_token, v_fee, v_total_to_pay;

  -- Handle different payment methods
  CASE v_payment_method
    WHEN 'usd_balance' THEN
      -- Check USD balance
      SELECT balance INTO v_user_balance
      FROM user_balances
      WHERE user_id = v_transaction.user_id
      AND asset_id = v_usd_asset_id;

      RAISE NOTICE 'USD balance check: balance=%, required=%', v_user_balance, v_total_to_pay;

      IF v_user_balance IS NULL THEN
        RAISE EXCEPTION 'No USD balance found for user';
      END IF;

      IF v_user_balance < v_total_to_pay THEN
        RAISE EXCEPTION 'Insufficient USD balance. Required: %, Available: %', v_total_to_pay, v_user_balance;
      END IF;

      -- Update USD balance
      UPDATE user_balances
      SET 
        balance = balance - v_total_to_pay,
        updated_at = NOW(),
        last_transaction_at = NOW()
      WHERE user_id = v_transaction.user_id
      AND asset_id = v_usd_asset_id;

      RAISE NOTICE 'Updated USD balance. New balance: %', (v_user_balance - v_total_to_pay);

    WHEN 'bank_account' THEN
      -- For bank account purchases, we proceed without additional checks
      NULL;

    WHEN 'usdc' THEN
      -- For USDC, verify the transfer has been confirmed
      IF NOT EXISTS (
        SELECT 1 FROM transactions 
        WHERE id = p_transaction_id 
        AND metadata->>'usdc_transfer_confirmed' = 'true'
      ) THEN
        RAISE EXCEPTION 'USDC transfer not confirmed for transaction';
      END IF;

    ELSE
      RAISE EXCEPTION 'Unsupported payment method: %', v_payment_method;
  END CASE;

  -- Handle different asset types
  CASE v_transaction.asset_type
    WHEN 'commodity' THEN
      IF v_transaction.asset_symbol IN ('BTC', 'HONEY') THEN
        RAISE NOTICE 'Processing direct commodity purchase for %', v_transaction.asset_symbol;
        -- For direct purchases, simply add to user's balance
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
          v_transaction.amount,
          NOW(),
          NOW(),
          NOW()
        ) ON CONFLICT (user_id, asset_id) DO UPDATE
        SET 
          balance = user_balances.balance + v_transaction.amount,
          updated_at = NOW(),
          last_transaction_at = NOW();
      
      ELSIF p_pool_id IS NOT NULL THEN
        RAISE NOTICE 'Processing pool-based commodity purchase';
        -- Get pool details
        SELECT p.*, ma.price_per_token as main_asset_price 
        INTO v_pool
        FROM pools p
        JOIN assets ma ON ma.id = p.main_asset_id
        WHERE p.id = p_pool_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Pool not found';
        END IF;

        -- Get current pool balance
        SELECT balance INTO v_initial_pool_balance
        FROM pool_assets
        WHERE pool_id = p_pool_id
        AND asset_id = v_transaction.asset_id;

        IF v_initial_pool_balance < v_transaction.amount THEN
          RAISE EXCEPTION 'Insufficient pool balance';
        END IF;

        -- Calculate main asset amount
        v_pool_main_asset_amount := v_total_to_pay / p_pool_main_asset_price;

        RAISE NOTICE 'Pool updates: removing_amount=%, adding_main_asset=%',
          v_transaction.amount, v_pool_main_asset_amount;

        -- Update pool balances
        UPDATE pool_assets
        SET balance = balance - v_transaction.amount
        WHERE pool_id = p_pool_id 
        AND asset_id = v_transaction.asset_id;

        -- Add main asset to pool
        INSERT INTO pool_assets (pool_id, asset_id, balance)
        VALUES (p_pool_id, v_pool.main_asset_id, v_pool_main_asset_amount)
        ON CONFLICT (pool_id, asset_id)
        DO UPDATE SET balance = pool_assets.balance + v_pool_main_asset_amount;

        -- Update pool's TVL
        UPDATE pools
        SET 
          total_value_locked = total_value_locked + v_total_to_pay,
          updated_at = NOW()
        WHERE id = p_pool_id;

        -- Add to user's balance
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
          v_transaction.amount,
          NOW(),
          NOW(),
          NOW()
        ) ON CONFLICT (user_id, asset_id) DO UPDATE
        SET 
          balance = user_balances.balance + v_transaction.amount,
          updated_at = NOW(),
          last_transaction_at = NOW();
      END IF;

    WHEN 'debt' THEN
      RAISE NOTICE 'Processing debt asset purchase: is_pool_asset=%', v_is_pool_asset;
      IF v_is_pool_asset THEN
        -- Handle pool debt asset purchase
        IF p_pool_id IS NULL THEN
          RAISE EXCEPTION 'Pool ID is required for pool debt asset purchases';
        END IF;

        -- Get pool details
        SELECT p.*, ma.price_per_token as main_asset_price 
        INTO v_pool
        FROM pools p
        JOIN assets ma ON ma.id = p.main_asset_id
        WHERE p.id = p_pool_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Pool not found';
        END IF;

        -- Get current pool balance
        SELECT balance INTO v_initial_pool_balance
        FROM pool_assets
        WHERE pool_id = p_pool_id
        AND asset_id = v_transaction.asset_id;

        IF v_initial_pool_balance < v_transaction.amount THEN
          RAISE EXCEPTION 'Insufficient pool balance';
        END IF;

        -- Calculate main asset amount
        v_pool_main_asset_amount := v_total_to_pay / p_pool_main_asset_price;

        RAISE NOTICE 'Pool debt asset updates: removing_amount=%, adding_main_asset=%',
          v_transaction.amount, v_pool_main_asset_amount;

        -- Update pool balances
        UPDATE pool_assets
        SET balance = balance - v_transaction.amount
        WHERE pool_id = p_pool_id 
        AND asset_id = v_transaction.asset_id;

        -- Add main asset to pool
        INSERT INTO pool_assets (pool_id, asset_id, balance)
        VALUES (p_pool_id, v_pool.main_asset_id, v_pool_main_asset_amount)
        ON CONFLICT (pool_id, asset_id)
        DO UPDATE SET balance = pool_assets.balance + v_pool_main_asset_amount;

        -- Update pool's TVL
        UPDATE pools
        SET 
          total_value_locked = total_value_locked + v_total_to_pay,
          updated_at = NOW()
        WHERE id = p_pool_id;
      END IF;

      -- Add to user's balance (for both pool and direct debt assets)
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
        v_transaction.amount,
        NOW(),
        NOW(),
        NOW()
      ) ON CONFLICT (user_id, asset_id) DO UPDATE
      SET 
        balance = user_balances.balance + v_transaction.amount,
        updated_at = NOW(),
        last_transaction_at = NOW();

      -- Update debt asset's funded amount
      UPDATE debt_assets
      SET 
        funded_amount = funded_amount + v_transaction.amount,
        updated_at = NOW()
      WHERE asset_id = v_transaction.asset_id;

    WHEN 'cash' THEN
      RAISE NOTICE 'Processing cash asset purchase';
      -- Add to user's balance
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
        v_transaction.amount,
        NOW(),
        NOW(),
        NOW()
      ) ON CONFLICT (user_id, asset_id) DO UPDATE
      SET 
        balance = user_balances.balance + v_transaction.amount,
        updated_at = NOW(),
        last_transaction_at = NOW();

    ELSE
      RAISE EXCEPTION 'Unsupported asset type: %', v_transaction.asset_type;
  END CASE;

  -- Update transaction status
  UPDATE transactions
  SET 
    status = 'completed',
    completed_at = NOW(),
    price_per_token = p_price_per_token,
    amount = v_transaction.amount,
    metadata = jsonb_set(
      jsonb_set(
        jsonb_set(
          metadata,
          '{final_amount}',
          to_jsonb(v_transaction.amount)
        ),
        '{final_price}',
        to_jsonb(p_price_per_token)
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
    'total_paid', v_total_to_pay,
    'fee', v_fee,
    'is_pool_asset', v_is_pool_asset,
    'pool_updates', CASE 
      WHEN v_is_pool_asset THEN 
        jsonb_build_object(
          'pool_id', p_pool_id,
          'asset_removed', v_transaction.amount,
          'main_asset_added', v_pool_main_asset_amount
        )
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
REVOKE ALL ON FUNCTION process_buy_transaction(UUID, DECIMAL, DECIMAL, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_buy_transaction(UUID, DECIMAL, DECIMAL, UUID) TO authenticated; 