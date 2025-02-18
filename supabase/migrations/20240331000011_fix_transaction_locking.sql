-- Drop existing function
DROP FUNCTION IF EXISTS approve_usd_balance_order(UUID, DECIMAL, DECIMAL);

-- Enhanced function with better locking
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
  RAISE NOTICE 'Starting approve_usd_balance_order for transaction %', p_transaction_id;
  
  -- First, get transaction data without any locks for debugging
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

  -- Lock the transaction row first
  BEGIN
    SELECT t.* INTO v_transaction
    FROM transactions t
    WHERE t.id = p_transaction_id
    FOR UPDATE NOWAIT;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Transaction not found';
    END IF;

    -- Now check the status after we have the lock
    IF v_transaction.status != 'pending' THEN
      RAISE EXCEPTION 'Transaction not in pending status. Current status: %', v_transaction.status;
    END IF;

    RAISE NOTICE 'Transaction locked and status verified: % (status: %)', 
      v_transaction.id, v_transaction.status;

    -- Get USD asset ID
    SELECT id INTO v_usd_asset_id
    FROM assets
    WHERE symbol = 'USD';
    
    RAISE NOTICE 'USD asset ID: %', v_usd_asset_id;

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

    RAISE NOTICE 'Calculated amounts: fee=%, total_to_pay=%, token_amount=%', 
      v_fee, v_total_to_pay, v_token_amount;

    -- Get current USD balance for logging
    SELECT balance INTO v_initial_usd_balance
    FROM user_balances 
    WHERE user_id = v_transaction.user_id 
    AND asset_id = v_usd_asset_id
    FOR UPDATE;  -- Lock the balance row

    RAISE NOTICE 'Initial USD balance: %', v_initial_usd_balance;

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
          to_jsonb(v_usd_amount)
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
    WHEN lock_not_available THEN
      RAISE EXCEPTION 'Transaction is currently locked by another process';
    WHEN OTHERS THEN
      RAISE NOTICE 'Error in transaction: % %', SQLERRM, SQLSTATE;
      RAISE EXCEPTION '%', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION approve_usd_balance_order(UUID, DECIMAL, DECIMAL) TO authenticated; 