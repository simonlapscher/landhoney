-- Drop existing function
DROP FUNCTION IF EXISTS approve_usd_balance_order(UUID, DECIMAL, DECIMAL);

-- Enhanced function with fixed pool balance updates
CREATE OR REPLACE FUNCTION approve_usd_balance_order(
  p_transaction_id UUID,
  p_price_per_token DECIMAL,
  p_pool_main_asset_price DECIMAL DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_transaction RECORD;
  v_debug_transaction RECORD;
  v_usd_asset_id UUID;
  v_total_to_pay DECIMAL;
  v_token_amount DECIMAL;
  v_fee DECIMAL;
  v_initial_usd_balance DECIMAL;
  v_payment_amount DECIMAL;
  v_pool_id UUID;
  v_pool_main_asset_id UUID;
  v_pool_main_asset_amount DECIMAL;
  v_initial_pool_balance DECIMAL;
BEGIN
  RAISE NOTICE 'Starting approve_usd_balance_order for transaction % with price %', p_transaction_id, p_price_per_token;
  
  -- Get transaction with asset info for debugging
  SELECT 
    t.*,
    a.type as asset_type,
    a.symbol as asset_symbol,
    u.email as user_email
  INTO v_debug_transaction
  FROM transactions t
  LEFT JOIN assets a ON t.asset_id = a.id
  LEFT JOIN auth.users u ON t.user_id = u.id
  WHERE t.id = p_transaction_id;
  
  RAISE NOTICE 'Debug transaction data: id=%, status=%, type=%, asset_type=%, asset_symbol=%, user=%, metadata=%',
    v_debug_transaction.id,
    v_debug_transaction.status,
    v_debug_transaction.type,
    v_debug_transaction.asset_type,
    v_debug_transaction.asset_symbol,
    v_debug_transaction.user_email,
    v_debug_transaction.metadata;

  -- Get USD asset ID
  SELECT id INTO v_usd_asset_id
  FROM assets
  WHERE symbol = 'USD';
  
  -- Now try to get and lock the transaction
  SELECT t.* INTO v_transaction
  FROM transactions t
  WHERE t.id = p_transaction_id
  AND t.status = 'pending'
  FOR UPDATE NOWAIT;
  
  IF v_transaction.id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found or not in pending status';
  END IF;

  -- Get the payment amount from the metadata (this is the USD amount)
  v_payment_amount := (v_transaction.metadata->>'usd_amount')::DECIMAL;
  IF v_payment_amount IS NULL THEN
    -- Fallback to the amount field multiplied by price if usd_amount not in metadata
    v_payment_amount := v_transaction.amount * v_transaction.price_per_token;
  END IF;
  RAISE NOTICE 'Payment amount from metadata: %', v_payment_amount;

  -- Calculate total payment including fee (0.5%)
  v_fee := v_payment_amount * 0.005;
  v_total_to_pay := v_payment_amount + v_fee;
  
  -- Calculate token amount based on price per token
  v_token_amount := v_payment_amount / p_price_per_token;

  RAISE NOTICE 'Amounts calculated: payment_amount=%, total_to_pay=%, fee=%, token_amount=%',
    v_payment_amount, v_total_to_pay, v_fee, v_token_amount;

  -- Get and lock USD balance
  SELECT balance INTO v_initial_usd_balance
  FROM user_balances 
  WHERE user_id = v_transaction.user_id 
  AND asset_id = v_usd_asset_id
  FOR UPDATE;

  RAISE NOTICE 'User balance found: %', v_initial_usd_balance;

  -- Verify USD balance
  IF v_initial_usd_balance < v_total_to_pay THEN
    RAISE EXCEPTION 'Insufficient USD balance. Required: %, Available: %',
      v_total_to_pay, v_initial_usd_balance;
  END IF;

  -- Get pool ID from metadata
  v_pool_id := (v_transaction.metadata->>'pool_id')::UUID;
  
  -- Process the transaction
  BEGIN
    -- Decrease USD balance
    UPDATE user_balances
    SET 
      balance = balance - v_total_to_pay,
      updated_at = NOW(),
      last_transaction_at = NOW()
    WHERE user_id = v_transaction.user_id 
    AND asset_id = v_usd_asset_id;

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

      -- Get current pool balance of the asset being purchased
      SELECT balance INTO v_initial_pool_balance
      FROM pool_assets
      WHERE pool_id = v_pool_id 
      AND asset_id = v_transaction.asset_id
      FOR UPDATE;

      RAISE NOTICE 'Initial pool balance for asset: %', v_initial_pool_balance;

      -- Verify pool has enough balance
      IF v_initial_pool_balance < v_token_amount THEN
        RAISE EXCEPTION 'Insufficient pool balance. Required: %, Available: %',
          v_token_amount, v_initial_pool_balance;
      END IF;

      -- Calculate main asset amount
      v_pool_main_asset_amount := v_total_to_pay / p_pool_main_asset_price;

      RAISE NOTICE 'Pool calculations: main_asset_amount=%, main_asset_price=%', 
        v_pool_main_asset_amount, p_pool_main_asset_price;

      -- Update pool balances
      UPDATE pool_assets
      SET 
        balance = balance - v_token_amount,
        updated_at = NOW()
      WHERE pool_id = v_pool_id 
      AND asset_id = v_transaction.asset_id;

      -- Update pool's main asset balance
      INSERT INTO pool_assets (
        pool_id, 
        asset_id, 
        balance,
        created_at,
        updated_at
      )
      VALUES (
        v_pool_id, 
        v_pool_main_asset_id, 
        v_pool_main_asset_amount,
        NOW(),
        NOW()
      )
      ON CONFLICT (pool_id, asset_id)
      DO UPDATE SET 
        balance = pool_assets.balance + v_pool_main_asset_amount,
        updated_at = NOW();

      -- Update pool's TVL
      UPDATE pools
      SET 
        total_value_locked = total_value_locked + v_total_to_pay,
        updated_at = NOW()
      WHERE id = v_pool_id;

      RAISE NOTICE 'Pool balances updated';
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
          to_jsonb(v_payment_amount)
        ),
        '{final_total_paid}',
        to_jsonb(v_total_to_pay)
      )
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    -- Return success response
    RETURN jsonb_build_object(
      'id', v_transaction.id,
      'status', 'completed',
      'amount', v_token_amount,
      'price_per_token', p_price_per_token,
      'total_paid', v_total_to_pay,
      'fee', v_fee,
      'payment_amount', v_payment_amount,
      'pool_updates', jsonb_build_object(
        'pool_id', v_pool_id,
        'asset_removed', v_token_amount,
        'main_asset_added', v_pool_main_asset_amount
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error in transaction: % %', SQLERRM, SQLSTATE;
      RAISE EXCEPTION '%', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
REVOKE ALL ON FUNCTION approve_usd_balance_order(UUID, DECIMAL, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_usd_balance_order(UUID, DECIMAL, DECIMAL) TO authenticated; 