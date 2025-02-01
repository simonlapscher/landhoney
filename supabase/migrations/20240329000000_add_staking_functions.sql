-- Function to handle Honey staking
CREATE OR REPLACE FUNCTION stake_honey(
  p_user_id UUID,
  p_amount NUMERIC,
  p_honey_id UUID,
  p_honeyx_id UUID,
  p_price_per_token NUMERIC
) RETURNS transactions AS $$
DECLARE
  v_transaction transactions;
BEGIN
  -- Check if user has enough HONEY balance
  IF NOT EXISTS (
    SELECT 1 FROM user_balances 
    WHERE user_id = p_user_id 
    AND asset_id = p_honey_id 
    AND balance >= p_amount
  ) THEN
    RAISE EXCEPTION 'Insufficient HONEY balance';
  END IF;

  -- Create the stake transaction
  INSERT INTO transactions (
    user_id,
    asset_id,
    type,
    amount,
    price_per_token,
    status,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_honey_id,
    'stake',
    p_amount,
    p_price_per_token,
    'completed',
    jsonb_build_object(
      'reference', CONCAT('STAKE_', extract(epoch from now())),
      'fee_usd', 0,
      'payment_method', 'USD'
    ),
    NOW(),
    NOW()
  ) RETURNING * INTO v_transaction;

  -- Decrease HONEY balance
  UPDATE user_balances 
  SET balance = balance - p_amount,
      updated_at = NOW(),
      last_transaction_at = NOW()
  WHERE user_id = p_user_id 
  AND asset_id = p_honey_id;

  -- Increase or create HONEYX balance
  INSERT INTO user_balances (
    user_id,
    asset_id,
    balance,
    total_interest_earned,
    created_at,
    updated_at,
    last_transaction_at
  ) VALUES (
    p_user_id,
    p_honeyx_id,
    p_amount,
    0,
    NOW(),
    NOW(),
    NOW()
  ) ON CONFLICT (user_id, asset_id) DO UPDATE
  SET balance = user_balances.balance + p_amount,
      updated_at = NOW(),
      last_transaction_at = NOW();

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- Function to handle Honey unstaking
CREATE OR REPLACE FUNCTION unstake_honey(
  p_user_id UUID,
  p_amount NUMERIC,
  p_honey_id UUID,
  p_honeyx_id UUID,
  p_price_per_token NUMERIC
) RETURNS transactions AS $$
DECLARE
  v_transaction transactions;
BEGIN
  -- Check if user has enough HONEYX balance
  IF NOT EXISTS (
    SELECT 1 FROM user_balances 
    WHERE user_id = p_user_id 
    AND asset_id = p_honeyx_id 
    AND balance >= p_amount
  ) THEN
    RAISE EXCEPTION 'Insufficient HONEYX balance';
  END IF;

  -- Create the unstake transaction
  INSERT INTO transactions (
    user_id,
    asset_id,
    type,
    amount,
    price_per_token,
    status,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_honey_id,
    'unstake',
    p_amount,
    p_price_per_token,
    'completed',
    jsonb_build_object(
      'reference', CONCAT('UNSTAKE_', extract(epoch from now())),
      'fee_usd', 0,
      'payment_method', 'USD'
    ),
    NOW(),
    NOW()
  ) RETURNING * INTO v_transaction;

  -- Decrease HONEYX balance
  UPDATE user_balances 
  SET balance = balance - p_amount,
      updated_at = NOW(),
      last_transaction_at = NOW()
  WHERE user_id = p_user_id 
  AND asset_id = p_honeyx_id;

  -- Increase or create HONEY balance
  INSERT INTO user_balances (
    user_id,
    asset_id,
    balance,
    total_interest_earned,
    created_at,
    updated_at,
    last_transaction_at
  ) VALUES (
    p_user_id,
    p_honey_id,
    p_amount,
    0,
    NOW(),
    NOW(),
    NOW()
  ) ON CONFLICT (user_id, asset_id) DO UPDATE
  SET balance = user_balances.balance + p_amount,
      updated_at = NOW(),
      last_transaction_at = NOW();

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql; 