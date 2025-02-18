-- Drop existing function
DROP FUNCTION IF EXISTS approve_usd_balance_order(UUID, DECIMAL, DECIMAL);

-- Enhanced function with schema fixes and more debugging
CREATE OR REPLACE FUNCTION approve_usd_balance_order(
  p_transaction_id UUID,
  p_price_per_token DECIMAL,
  p_pool_main_asset_price DECIMAL DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_transaction RECORD;
  v_debug_transaction RECORD;
  v_raw_transaction RECORD;
  v_usd_asset_id UUID;
  v_total_to_pay DECIMAL;
  v_token_amount DECIMAL;
  v_fee DECIMAL;
  v_initial_usd_balance DECIMAL;
BEGIN
  RAISE NOTICE 'Starting approve_usd_balance_order for transaction %', p_transaction_id;
  
  -- First try to get the raw transaction without any joins or conditions
  SELECT * INTO v_raw_transaction
  FROM transactions
  WHERE id = p_transaction_id;
  
  RAISE NOTICE 'Raw transaction lookup result: found=%, status=%, type=%',
    v_raw_transaction IS NOT NULL,
    v_raw_transaction.status,
    v_raw_transaction.type;

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
  
  RAISE NOTICE 'Debug transaction data: id=%, status=%, type=%, asset_type=%, asset_symbol=%, user=%',
    v_debug_transaction.id,
    v_debug_transaction.status,
    v_debug_transaction.type,
    v_debug_transaction.asset_type,
    v_debug_transaction.asset_symbol,
    v_debug_transaction.user_email;

  -- Get USD asset ID first
  SELECT id INTO v_usd_asset_id
  FROM assets
  WHERE symbol = 'USD';
  
  RAISE NOTICE 'USD asset ID: %', v_usd_asset_id;

  -- Now try to get and lock the transaction
  SELECT t.* INTO v_transaction
  FROM transactions t
  WHERE t.id = p_transaction_id
  FOR UPDATE NOWAIT;
  
  IF v_transaction.id IS NULL THEN
    RAISE NOTICE 'Transaction not found in final select. Raw transaction exists: %', 
      v_raw_transaction.id IS NOT NULL;
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Check status after we have the lock
  IF v_transaction.status != 'pending' THEN
    RAISE NOTICE 'Transaction status mismatch: expected pending, got %', v_transaction.status;
    RAISE EXCEPTION 'Transaction not in pending status. Current status: %', v_transaction.status;
  END IF;

  -- Get USD amount from metadata
  v_total_to_pay := (v_transaction.metadata->>'usd_amount')::DECIMAL;
  IF v_total_to_pay IS NULL THEN
    RAISE NOTICE 'USD amount not found in metadata: %', v_transaction.metadata;
    RAISE EXCEPTION 'USD amount not found in transaction metadata';
  END IF;

  -- Calculate fee (0.5%)
  v_fee := v_total_to_pay * 0.005;
  v_total_to_pay := v_total_to_pay + v_fee;
  
  -- Calculate token amount
  v_token_amount := v_total_to_pay / p_price_per_token;

  RAISE NOTICE 'Amounts calculated: total_to_pay=%, fee=%, token_amount=%',
    v_total_to_pay, v_fee, v_token_amount;

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

  -- Process the transaction
  UPDATE user_balances
  SET 
    balance = balance - v_total_to_pay,
    updated_at = NOW(),
    last_transaction_at = NOW()
  WHERE user_id = v_transaction.user_id 
  AND asset_id = v_usd_asset_id;

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
        to_jsonb(v_total_to_pay - v_fee)
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
    'fee', v_fee
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in transaction: % %', SQLERRM, SQLSTATE;
    RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
REVOKE ALL ON FUNCTION approve_usd_balance_order(UUID, DECIMAL, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_usd_balance_order(UUID, DECIMAL, DECIMAL) TO authenticated; 