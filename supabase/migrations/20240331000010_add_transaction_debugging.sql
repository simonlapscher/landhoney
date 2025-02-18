-- Drop existing function
DROP FUNCTION IF EXISTS approve_usd_balance_order(UUID, DECIMAL, DECIMAL);

-- Enhanced function with detailed logging
CREATE OR REPLACE FUNCTION approve_usd_balance_order(
  p_transaction_id UUID,
  p_price_per_token DECIMAL,
  p_pool_main_asset_price DECIMAL DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_transaction RECORD;
  v_debug_transaction RECORD;
  v_raw_transaction RECORD;
BEGIN
  RAISE NOTICE 'Starting approve_usd_balance_order for transaction %', p_transaction_id;
  
  -- First, get raw transaction data without any locks
  SELECT t.*, a.symbol, a.type 
  INTO v_debug_transaction
  FROM transactions t
  LEFT JOIN assets a ON t.asset_id = a.id
  WHERE t.id = p_transaction_id;
  
  RAISE NOTICE 'Debug transaction data: id=%, status=%, type=%, symbol=%, metadata=%',
    v_debug_transaction.id,
    v_debug_transaction.status,
    v_debug_transaction.type,
    v_debug_transaction.symbol,
    v_debug_transaction.metadata;

  -- Now try to get the transaction with a lock
  SELECT t.* 
  INTO v_raw_transaction
  FROM transactions t
  WHERE t.id = p_transaction_id
  FOR UPDATE NOWAIT;
  
  RAISE NOTICE 'Raw transaction query result: found=%, status=%',
    v_raw_transaction IS NOT NULL,
    v_raw_transaction.status;

  -- Get full transaction details
  SELECT t.*, a.symbol, a.type 
  INTO v_transaction
  FROM transactions t
  JOIN assets a ON t.asset_id = a.id
  WHERE t.id = p_transaction_id
  AND t.status = 'pending'
  FOR UPDATE NOWAIT;

  -- Enhanced error handling for transaction lookup
  IF v_transaction.id IS NULL THEN
    IF v_debug_transaction.id IS NULL THEN
      RAISE NOTICE 'Transaction % does not exist', p_transaction_id;
      RAISE EXCEPTION 'Transaction not found';
    ELSE
      RAISE NOTICE 'Transaction exists but status is: % (expected: pending)', v_debug_transaction.status;
      RAISE EXCEPTION 'Transaction % not in pending status. Current status: %', 
        p_transaction_id, 
        v_debug_transaction.status;
    END IF;
  END IF;

  RAISE NOTICE 'Transaction found and locked: % (status: %)', v_transaction.id, v_transaction.status;

  -- Return transaction details for debugging
  RETURN jsonb_build_object(
    'id', v_transaction.id,
    'status', v_transaction.status,
    'type', v_transaction.type,
    'symbol', v_transaction.symbol,
    'metadata', v_transaction.metadata,
    'debug_info', jsonb_build_object(
      'raw_transaction_found', v_raw_transaction IS NOT NULL,
      'raw_transaction_status', v_raw_transaction.status,
      'debug_transaction_found', v_debug_transaction IS NOT NULL,
      'debug_transaction_status', v_debug_transaction.status
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION approve_usd_balance_order(UUID, DECIMAL, DECIMAL) TO authenticated; 