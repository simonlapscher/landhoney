-- Create function to process transactions
CREATE OR REPLACE FUNCTION process_transaction(
  p_transaction_id UUID,
  p_action TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_new_status TEXT;
  v_balance NUMERIC;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or not in pending status';
  END IF;

  -- Set new status based on action
  IF p_action = 'approve' THEN
    v_new_status := 'completed';
  ELSIF p_action = 'reject' THEN
    v_new_status := 'failed';
  ELSE
    RAISE EXCEPTION 'Invalid action. Must be either approve or reject';
  END IF;

  -- Update transaction status
  UPDATE transactions
  SET 
    status = v_new_status,
    completed_at = CASE WHEN v_new_status = 'completed' THEN NOW() ELSE NULL END
  WHERE id = p_transaction_id;

  -- If approved, update user balance
  IF v_new_status = 'completed' THEN
    -- For buy transactions, add to balance
    IF v_transaction.type = 'buy' THEN
      INSERT INTO user_balances (user_id, asset_id, balance, last_transaction_at)
      VALUES (v_transaction.user_id, v_transaction.asset_id, v_transaction.amount, NOW())
      ON CONFLICT (user_id, asset_id)
      DO UPDATE SET
        balance = user_balances.balance + v_transaction.amount,
        last_transaction_at = NOW();
    
    -- For sell transactions, subtract from balance
    ELSIF v_transaction.type = 'sell' THEN
      -- Check if user has enough balance
      SELECT balance INTO v_balance
      FROM user_balances
      WHERE user_id = v_transaction.user_id
        AND asset_id = v_transaction.asset_id;

      IF v_balance < v_transaction.amount THEN
        RAISE EXCEPTION 'Insufficient balance for sell transaction';
      END IF;

      -- Subtract the amount from user's balance
      UPDATE user_balances
      SET 
        balance = balance - v_transaction.amount,
        last_transaction_at = NOW()
      WHERE user_id = v_transaction.user_id
        AND asset_id = v_transaction.asset_id;
    END IF;
  END IF;
END;
$$; 