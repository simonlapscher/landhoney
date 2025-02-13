-- Function to process direct asset transactions (BTC and HONEY only)
CREATE OR REPLACE FUNCTION process_direct_asset_transaction(
  p_transaction_id UUID,
  p_price_per_token DECIMAL,
  p_amount DECIMAL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction RECORD;
  v_user_id UUID;
  v_asset_id UUID;
  v_asset_symbol TEXT;
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

  -- Verify this is a BTC or HONEY transaction
  IF v_transaction.symbol NOT IN ('BTC', 'HONEY') THEN
    RAISE EXCEPTION 'This function only processes BTC and HONEY transactions';
  END IF;

  -- Store user_id and asset_id for convenience
  v_user_id := v_transaction.user_id;
  v_asset_id := v_transaction.asset_id;
  v_asset_symbol := v_transaction.symbol;

  -- Update transaction price and status
  UPDATE transactions
  SET 
    price_per_token = p_price_per_token,
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transaction_id
  RETURNING * INTO v_transaction;

  -- For buy transactions, add to user's balance
  IF v_transaction.type = 'buy' THEN
    INSERT INTO user_balances (
      user_id,
      asset_id,
      balance,
      created_at,
      updated_at,
      last_transaction_at
    )
    VALUES (
      v_user_id,
      v_asset_id,
      p_amount,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, asset_id)
    DO UPDATE SET
      balance = user_balances.balance + p_amount,
      updated_at = NOW(),
      last_transaction_at = NOW();
  
  -- For sell transactions, subtract from user's balance
  ELSIF v_transaction.type = 'sell' THEN
    -- Check if user has enough balance
    IF NOT EXISTS (
      SELECT 1
      FROM user_balances
      WHERE user_id = v_user_id
        AND asset_id = v_asset_id
        AND balance >= p_amount
    ) THEN
      RAISE EXCEPTION 'Insufficient % balance', v_asset_symbol;
    END IF;

    -- Subtract from user's balance
    UPDATE user_balances
    SET 
      balance = balance - p_amount,
      updated_at = NOW(),
      last_transaction_at = NOW()
    WHERE user_id = v_user_id
      AND asset_id = v_asset_id;
  END IF;

  -- Return the updated transaction as jsonb
  RETURN row_to_json(v_transaction)::jsonb;
END;
$$;

-- Revoke all permissions from public
REVOKE ALL ON FUNCTION process_direct_asset_transaction(UUID, DECIMAL, DECIMAL) FROM PUBLIC;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_direct_asset_transaction(UUID, DECIMAL, DECIMAL) TO authenticated; 