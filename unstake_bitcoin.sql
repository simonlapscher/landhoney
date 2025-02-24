-- First drop any existing versions of the function
DROP FUNCTION IF EXISTS unstake_bitcoin(uuid, numeric, uuid, uuid, numeric);
DROP FUNCTION IF EXISTS unstake_bitcoin(uuid, uuid, uuid, numeric, numeric);

-- Create the new function with a clear parameter order
CREATE OR REPLACE FUNCTION unstake_bitcoin(
    p_user_id UUID,
    p_btc_asset_id UUID,
    p_btcx_asset_id UUID,
    p_amount NUMERIC,
    p_price_per_token NUMERIC
) RETURNS transactions AS $$
DECLARE
    v_transaction transactions;
    v_pool_id UUID;
    v_btcps_asset_id UUID;
    v_current_pool_shares DECIMAL;
    v_current_user_shares DECIMAL;
    v_total_value_locked DECIMAL;
    v_unstake_value DECIMAL;
    v_shares_to_burn DECIMAL;
BEGIN
    -- Get the pool ID for Bitcoin
    SELECT get_pool_for_asset('BTC') INTO v_pool_id;
    
    -- Get BTCPS asset ID
    SELECT id INTO v_btcps_asset_id
    FROM assets
    WHERE symbol = 'BTCPS';

    -- Get current pool shares total
    SELECT COALESCE(balance, 0) INTO v_current_pool_shares
    FROM pool_assets
    WHERE pool_id = v_pool_id
    AND asset_id = v_btcps_asset_id;

    -- Get current user shares
    SELECT COALESCE(balance, 0) INTO v_current_user_shares
    FROM user_balances
    WHERE user_id = p_user_id
    AND asset_id = v_btcps_asset_id;

    -- Get pool's current TVL
    SELECT total_value_locked INTO v_total_value_locked
    FROM pools
    WHERE id = v_pool_id;

    -- Calculate unstake value and shares to burn
    v_unstake_value := p_amount * p_price_per_token;
    v_shares_to_burn := (v_unstake_value / v_total_value_locked) * v_current_pool_shares;

    -- Check if user has enough BTCX balance
    IF NOT EXISTS (
        SELECT 1 FROM user_balances 
        WHERE user_id = p_user_id 
        AND asset_id = p_btcx_asset_id 
        AND balance >= p_amount
    ) THEN
        RAISE EXCEPTION 'Insufficient BTCX balance';
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
        p_btc_asset_id,
        'unstake',
        p_amount,
        p_price_per_token,
        'completed',
        jsonb_build_object(
            'reference', CONCAT('UNSTAKE_', extract(epoch from now())),
            'pool_id', v_pool_id,
            'shares_burned', v_shares_to_burn
        ),
        NOW(),
        NOW()
    ) RETURNING * INTO v_transaction;

    -- Update pool shares balance (burn shares)
    UPDATE pool_assets 
    SET balance = balance - v_shares_to_burn,
        updated_at = NOW()
    WHERE pool_id = v_pool_id 
    AND asset_id = v_btcps_asset_id;

    -- Update user's share balance (burn shares)
    UPDATE user_balances 
    SET balance = balance - v_shares_to_burn,
        updated_at = NOW(),
        last_transaction_at = NOW()
    WHERE user_id = p_user_id 
    AND asset_id = v_btcps_asset_id;

    -- Update pool's BTCX balance
    UPDATE pool_assets 
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE pool_id = v_pool_id 
    AND asset_id = p_btcx_asset_id;

    -- Decrease BTCX balance
    UPDATE user_balances 
    SET balance = balance - p_amount,
        updated_at = NOW(),
        last_transaction_at = NOW()
    WHERE user_id = p_user_id 
    AND asset_id = p_btcx_asset_id;

    -- Increase BTC balance
    UPDATE user_balances 
    SET balance = balance + p_amount,
        updated_at = NOW(),
        last_transaction_at = NOW()
    WHERE user_id = p_user_id 
    AND asset_id = p_btc_asset_id;

    RETURN v_transaction;
END;
$$ LANGUAGE plpgsql; 