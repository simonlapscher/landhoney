-- Drop existing function
DROP FUNCTION IF EXISTS create_usd_balance_order(UUID, UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL);

-- Function to create a USD balance order
CREATE OR REPLACE FUNCTION create_usd_balance_order(
  p_user_id UUID,
  p_asset_id UUID,
  p_amount DECIMAL,
  p_price_per_token DECIMAL,
  p_fee DECIMAL,
  p_total_to_pay DECIMAL
) RETURNS transactions AS $$
DECLARE
  v_usd_asset_id UUID;
  v_usd_balance DECIMAL;
  v_transaction transactions;
  v_asset_type TEXT;
  v_pool_id UUID;
BEGIN
  -- Get USD asset ID
  SELECT id INTO v_usd_asset_id
  FROM assets
  WHERE symbol = 'USD';

  -- Get user's USD balance
  SELECT balance INTO v_usd_balance
  FROM user_balances
  WHERE user_id = p_user_id AND asset_id = v_usd_asset_id;

  -- Get asset type and check if it's in a pool
  SELECT 
    a.type,
    (SELECT p.id 
     FROM pools p 
     JOIN pool_assets pa ON pa.pool_id = p.id 
     WHERE pa.asset_id = a.id 
     LIMIT 1) as pool_id
  INTO v_asset_type, v_pool_id
  FROM assets a
  WHERE a.id = p_asset_id;

  RAISE NOTICE 'Asset type: %, Pool ID: %, USD Balance: %, Total to pay: %', 
    v_asset_type, v_pool_id, v_usd_balance, p_total_to_pay;

  -- Verify sufficient balance
  IF v_usd_balance < p_total_to_pay THEN
    RAISE EXCEPTION 'Insufficient USD balance';
  END IF;

  -- For debt assets from direct offering (not in pool) or USD, create completed transaction
  IF (v_asset_type = 'debt' AND v_pool_id IS NULL) OR v_asset_type = 'cash' THEN
    RAISE NOTICE 'Creating completed transaction for direct debt asset or USD';
    
    -- Create completed transaction
    INSERT INTO transactions (
      user_id,
      asset_id,
      type,
      amount,
      price_per_token,
      status,
      metadata,
      completed_at
    ) VALUES (
      p_user_id,
      p_asset_id,
      'buy',
      p_amount,
      p_price_per_token,
      'completed',
      jsonb_build_object(
        'fee_usd', p_fee,
        'payment_method', 'usd_balance',
        'usd_amount', p_total_to_pay - p_fee
      ),
      NOW()
    ) RETURNING * INTO v_transaction;

    -- Update balances immediately
    UPDATE user_balances
    SET 
      balance = balance - p_total_to_pay,
      updated_at = NOW(),
      last_transaction_at = NOW()
    WHERE user_id = p_user_id 
    AND asset_id = v_usd_asset_id;

    INSERT INTO user_balances (user_id, asset_id, balance)
    VALUES (p_user_id, p_asset_id, p_amount)
    ON CONFLICT (user_id, asset_id)
    DO UPDATE SET 
      balance = user_balances.balance + p_amount,
      updated_at = NOW(),
      last_transaction_at = NOW();

    RAISE NOTICE 'Completed transaction created and balances updated';
  ELSE
    RAISE NOTICE 'Creating pending transaction for pool asset or commodity';
    
    -- For pool assets or commodities, create pending transaction
    INSERT INTO transactions (
      user_id,
      asset_id,
      type,
      amount,
      price_per_token,
      status,
      metadata
    ) VALUES (
      p_user_id,
      p_asset_id,
      'buy',
      p_amount,
      p_price_per_token,
      'pending',
      jsonb_build_object(
        'fee_usd', p_fee,
        'payment_method', 'usd_balance',
        'pool_id', v_pool_id,
        'usd_amount', p_total_to_pay - p_fee,
        'is_commodity', v_asset_type = 'commodity'
      )
    ) RETURNING * INTO v_transaction;

    RAISE NOTICE 'Pending transaction created';
  END IF;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function
DROP FUNCTION IF EXISTS approve_usd_balance_order(UUID, DECIMAL, DECIMAL);

-- Function to approve a USD balance order
CREATE OR REPLACE FUNCTION approve_usd_balance_order(
  p_transaction_id UUID,
  p_price_per_token DECIMAL DEFAULT NULL,
  p_pool_main_asset_price DECIMAL DEFAULT NULL
) RETURNS transactions AS $$
DECLARE
  v_transaction transactions;
  v_metadata jsonb;
  v_is_pool_transaction BOOLEAN;
  v_is_commodity BOOLEAN;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Extract metadata
  v_metadata := v_transaction.metadata;
  v_is_pool_transaction := v_metadata->>'pool_id' IS NOT NULL;
  v_is_commodity := (v_metadata->>'is_commodity')::BOOLEAN;

  -- For pool transactions or commodities, we need both prices
  IF v_is_pool_transaction OR v_is_commodity THEN
    IF p_price_per_token IS NULL THEN
      RAISE EXCEPTION 'Price per token is required for pool transactions and commodities';
    END IF;
    
    IF v_is_pool_transaction AND p_pool_main_asset_price IS NULL THEN
      RAISE EXCEPTION 'Pool main asset price is required for pool transactions';
    END IF;
  END IF;

  -- Update transaction status and metadata
  UPDATE transactions
  SET 
    status = 'completed',
    completed_at = NOW(),
    metadata = v_metadata || jsonb_build_object(
      'approved_price_per_token', p_price_per_token,
      'pool_main_asset_price', p_pool_main_asset_price
    )
  WHERE id = p_transaction_id
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_usd_balance_order(UUID, UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_usd_balance_order(UUID, DECIMAL, DECIMAL) TO authenticated; 