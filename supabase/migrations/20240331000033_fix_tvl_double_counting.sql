-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_staking_positions_trigger ON transactions;
DROP FUNCTION IF EXISTS update_staking_positions();

-- Create or replace the update_staking_positions function
CREATE OR REPLACE FUNCTION update_staking_positions()
RETURNS TRIGGER AS $$
DECLARE
    v_pool_id UUID;
    v_shares_asset_id UUID;
    v_shares_amount DECIMAL;
    v_btcx_asset_id UUID;
    v_honeyx_asset_id UUID;
    v_asset_symbol TEXT;
    v_pool_share_symbol TEXT;
    v_current_pool_shares DECIMAL;
    v_current_user_shares DECIMAL;
    v_total_value_locked DECIMAL;
    v_stake_value DECIMAL;
BEGIN
    IF NEW.type = 'stake' AND NEW.status = 'completed' THEN
        -- Get the asset symbol first
        SELECT symbol INTO v_asset_symbol
        FROM assets
        WHERE id = NEW.asset_id;

        -- Log the asset being staked
        RAISE NOTICE 'Processing stake for asset: %', v_asset_symbol;

        -- Determine pool share symbol
        v_pool_share_symbol := CASE 
            WHEN v_asset_symbol = 'BTC' THEN 'BTCPS'
            WHEN v_asset_symbol = 'HONEY' THEN 'HONEYPS'
        END;

        -- Get the appropriate pool ID and shares asset ID
        SELECT p.id, a.id INTO v_pool_id, v_shares_asset_id
        FROM pools p
        CROSS JOIN assets a
        WHERE p.type = (
            CASE 
                WHEN v_asset_symbol = 'BTC' THEN 'bitcoin'::pool_type
                WHEN v_asset_symbol = 'HONEY' THEN 'honey'::pool_type
            END
        )
        AND a.symbol = v_pool_share_symbol;

        -- Log pool lookup results
        RAISE NOTICE 'Pool lookup results - pool_id: %, shares_asset_id: %', v_pool_id, v_shares_asset_id;

        -- Verify we found the pool and shares asset
        IF v_pool_id IS NULL THEN
            RAISE EXCEPTION 'Pool not found for asset: %', v_asset_symbol;
        END IF;

        IF v_shares_asset_id IS NULL THEN
            RAISE EXCEPTION 'Shares asset not found for asset: %', v_asset_symbol;
        END IF;

        -- Get current pool shares total
        SELECT COALESCE(balance, 0) INTO v_current_pool_shares
        FROM pool_assets
        WHERE pool_id = v_pool_id
        AND asset_id = v_shares_asset_id;

        -- Get current user shares
        SELECT COALESCE(balance, 0) INTO v_current_user_shares
        FROM user_balances
        WHERE user_id = NEW.user_id
        AND asset_id = v_shares_asset_id;

        -- Get pool's current TVL and calculate stake value
        SELECT total_value_locked INTO v_total_value_locked
        FROM pools
        WHERE id = v_pool_id;

        v_stake_value := NEW.amount * NEW.price_per_token;

        -- Calculate new shares to mint
        -- If this is the first stake (no existing shares), mint 1:1
        -- Otherwise, mint proportional to the stake value relative to current TVL
        v_shares_amount := CASE 
            WHEN v_current_pool_shares = 0 THEN NEW.amount
            ELSE (v_stake_value / v_total_value_locked) * v_current_pool_shares
        END;

        -- Log share calculations
        RAISE NOTICE 'Share calculations - current_pool_shares: %, stake_value: %, tvl: %, new_shares: %',
            v_current_pool_shares, v_stake_value, v_total_value_locked, v_shares_amount;

        -- Update pool shares balance
        INSERT INTO pool_assets (
            pool_id,
            asset_id,
            balance,
            created_at,
            updated_at
        ) VALUES (
            v_pool_id,
            v_shares_asset_id,
            COALESCE(v_current_pool_shares, 0) + v_shares_amount,
            NOW(),
            NOW()
        ) ON CONFLICT (pool_id, asset_id) 
        DO UPDATE SET
            balance = EXCLUDED.balance,
            updated_at = NOW();

        -- Update user's share balance
        INSERT INTO user_balances (
            user_id,
            asset_id,
            balance,
            created_at,
            updated_at,
            last_transaction_at
        ) VALUES (
            NEW.user_id,
            v_shares_asset_id,
            COALESCE(v_current_user_shares, 0) + v_shares_amount,
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id, asset_id)
        DO UPDATE SET
            balance = EXCLUDED.balance,
            updated_at = NOW(),
            last_transaction_at = NOW();

        -- Get BTCX/HONEYX asset ID
        SELECT id INTO v_btcx_asset_id FROM assets WHERE symbol = 'BTCX';
        SELECT id INTO v_honeyx_asset_id FROM assets WHERE symbol = 'HONEYX';

        -- Update pool's main asset (BTCX/HONEYX) balance
        INSERT INTO pool_assets (
            pool_id,
            asset_id,
            balance,
            created_at,
            updated_at
        ) VALUES (
            v_pool_id,
            CASE 
                WHEN v_asset_symbol = 'BTC' THEN v_btcx_asset_id
                ELSE v_honeyx_asset_id
            END,
            NEW.amount,
            NOW(),
            NOW()
        ) ON CONFLICT (pool_id, asset_id) 
        DO UPDATE SET
            balance = pool_assets.balance + NEW.amount,
            updated_at = NOW();

        -- Log completion
        RAISE NOTICE 'Stake processing completed successfully';
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error details
        RAISE NOTICE 'Error in update_staking_positions: % %', SQLERRM, SQLSTATE;
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_staking_positions_trigger
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_staking_positions();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_staking_positions() TO authenticated; 