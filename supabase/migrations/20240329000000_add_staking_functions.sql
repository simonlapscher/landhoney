-- Function to get pool ID for an asset
CREATE OR REPLACE FUNCTION get_pool_for_asset(p_asset_symbol TEXT)
RETURNS UUID AS $$
DECLARE
  v_pool_id UUID;
  v_pool_type TEXT;
BEGIN
  -- First determine the pool type based on asset symbol
  v_pool_type := CASE 
    WHEN p_asset_symbol IN ('HONEY', 'HONEYX') THEN 'honey'
    WHEN p_asset_symbol IN ('BTC', 'BTCX') THEN 'bitcoin'
    ELSE NULL
  END;

  IF v_pool_type IS NULL THEN
    RAISE EXCEPTION 'Invalid asset symbol for pool lookup: %', p_asset_symbol;
  END IF;

  -- Get the pool ID
  SELECT id INTO v_pool_id
  FROM pools
  WHERE type = v_pool_type::pool_type;

  IF v_pool_id IS NULL THEN
    RAISE EXCEPTION 'Pool not found for type: %', v_pool_type;
  END IF;
  
  RETURN v_pool_id;
END;
$$ LANGUAGE plpgsql;

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
    v_pool_id UUID;
BEGIN
    -- Get the pool ID for Honey with better error handling
    BEGIN
        SELECT get_pool_for_asset('HONEY') INTO STRICT v_pool_id;
    EXCEPTION WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Honey pool not found or not properly configured';
    END;

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
            'payment_method', 'USD',
            'pool_id', v_pool_id
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

    -- Increase or create HONEYX balance for user
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

    -- The following operations will be handled by triggers:
    -- 1. Updating pool assets
    -- 2. Creating/updating staking positions
    -- 3. Updating ownership percentages
    -- 4. Updating pool TVL

    RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the function is accessible to authenticated users
REVOKE ALL ON FUNCTION stake_honey(UUID, NUMERIC, UUID, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION stake_honey(UUID, NUMERIC, UUID, UUID, NUMERIC) TO authenticated;

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
  v_pool_id UUID;
BEGIN
  -- Get the pool ID for Honey
  SELECT get_pool_for_asset('HONEY') INTO v_pool_id;

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
      'payment_method', 'USD',
      'pool_id', v_pool_id
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

-- Create function to update TVL after transactions
CREATE OR REPLACE FUNCTION update_tvl_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Only handle completed stake/unstake transactions
  IF NEW.status = 'completed' AND NEW.type IN ('stake', 'unstake') THEN
    -- Get pool ID from transaction metadata
    DECLARE
      v_pool_id UUID := (NEW.metadata->>'pool_id')::UUID;
      v_amount NUMERIC := NEW.amount;
      v_price_per_token NUMERIC := NEW.price_per_token;
    BEGIN
      IF v_pool_id IS NOT NULL THEN
        -- For unstaking, we need to subtract from TVL
        IF NEW.type = 'unstake' THEN
          v_amount := -v_amount;
        END IF;

        -- Update pool TVL
        UPDATE pools
        SET total_value_locked = total_value_locked + (v_amount * v_price_per_token)
        WHERE id = v_pool_id;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for TVL updates
DROP TRIGGER IF EXISTS update_tvl_after_transaction_trigger ON transactions;
CREATE TRIGGER update_tvl_after_transaction_trigger
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_tvl_after_transaction(); 