-- Drop existing function
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL, DECIMAL);

-- Enhanced process_buy_transaction function
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
  v_asset RECORD;
  v_usd_asset_id UUID;
  v_pool_main_asset_amount DECIMAL;
  v_total_to_pay DECIMAL;
  v_fee DECIMAL;
  v_payment_method TEXT;
  v_user_balance DECIMAL;
  v_initial_pool_balance DECIMAL;
BEGIN
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
  FOR UPDATE NOWAIT;  -- Use NOWAIT to fail fast if locked

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or not in pending status';
  END IF;

  -- Get USD asset ID for balance checks
  SELECT id INTO v_usd_asset_id
  FROM assets
  WHERE symbol = 'USD';

  -- Get payment method from metadata
  v_payment_method := v_transaction.metadata->>'payment_method';
  IF v_payment_method IS NULL THEN
    RAISE EXCEPTION 'Payment method not specified in transaction metadata';
  END IF;

  -- Calculate fee (0.5%)
  v_fee := p_amount * p_price_per_token * 0.005;
  v_total_to_pay := (p_amount * p_price_per_token) + v_fee;

  -- Handle different payment methods
  CASE v_payment_method
    WHEN 'usd_balance' THEN
      -- Check USD balance
      SELECT balance INTO v_user_balance
      FROM user_balances
      WHERE user_id = v_transaction.user_id
      AND asset_id = v_usd_asset_id;

      IF v_user_balance < v_total_to_pay THEN
        RAISE EXCEPTION 'Insufficient USD balance. Required: %, Available: %', v_total_to_pay, v_user_balance;
      END IF;

      -- Deduct from USD balance
      UPDATE user_balances
      SET 
        balance = balance - v_total_to_pay,
        updated_at = NOW(),
        last_transaction_at = NOW()
      WHERE user_id = v_transaction.user_id
      AND asset_id = v_usd_asset_id;

    WHEN 'bank_account' THEN
      -- For bank account, we just verify the transaction exists
      -- Actual payment processing should be handled externally
      IF NOT EXISTS (
        SELECT 1 FROM transactions 
        WHERE id = p_transaction_id 
        AND metadata->>'bank_transfer_confirmed' = 'true'
      ) THEN
        RAISE EXCEPTION 'Bank transfer not confirmed for transaction';
      END IF;

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
    -- Direct asset purchases (BTC, HONEY)
    WHEN 'commodity' THEN
      IF v_transaction.asset_symbol IN ('BTC', 'HONEY') THEN
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
          p_amount,
          NOW(),
          NOW(),
          NOW()
        ) ON CONFLICT (user_id, asset_id) DO UPDATE
        SET 
          balance = user_balances.balance + p_amount,
          updated_at = NOW(),
          last_transaction_at = NOW();
      
      -- Pool-based commodity purchases
      ELSIF p_pool_id IS NOT NULL THEN
        -- Get pool details
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

        -- Get current pool balance
        SELECT balance INTO v_initial_pool_balance
        FROM pool_assets
        WHERE pool_id = p_pool_id
        AND asset_id = v_transaction.asset_id;

        IF v_initial_pool_balance < p_amount THEN
          RAISE EXCEPTION 'Insufficient pool balance';
        END IF;

        -- Calculate main asset amount
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
          p_amount,
          NOW(),
          NOW(),
          NOW()
        ) ON CONFLICT (user_id, asset_id) DO UPDATE
        SET 
          balance = user_balances.balance + p_amount,
          updated_at = NOW(),
          last_transaction_at = NOW();
      END IF;

    -- Debt asset purchases
    WHEN 'debt' THEN
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
        p_amount,
        NOW(),
        NOW(),
        NOW()
      ) ON CONFLICT (user_id, asset_id) DO UPDATE
      SET 
        balance = user_balances.balance + p_amount,
        updated_at = NOW(),
        last_transaction_at = NOW();

    -- Cash (USD) purchases
    WHEN 'cash' THEN
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
        p_amount,
        NOW(),
        NOW(),
        NOW()
      ) ON CONFLICT (user_id, asset_id) DO UPDATE
      SET 
        balance = user_balances.balance + p_amount,
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
    amount = p_amount,
    metadata = jsonb_set(
      jsonb_set(
        jsonb_set(
          metadata,
          '{final_amount}',
          to_jsonb(p_amount)
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
    'status', v_transaction.status,
    'metadata', v_transaction.metadata,
    'completed_at', v_transaction.completed_at
  );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL, DECIMAL) TO authenticated; 