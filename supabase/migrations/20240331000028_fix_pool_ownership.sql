-- Reset all staking-related data
BEGIN;

-- Delete all staking positions
DELETE FROM staking_positions;

-- Delete all stake/unstake transactions
DELETE FROM transactions 
WHERE type IN ('stake', 'unstake');

-- Reset pool assets
UPDATE pool_assets 
SET balance = 0;

-- Reset pool TVL
UPDATE pools 
SET total_value_locked = 0;

-- Convert BTCX to BTC and handle BTCPS
WITH btc_assets AS (
  SELECT id, symbol 
  FROM assets 
  WHERE symbol IN ('BTC', 'BTCX', 'BTCPS')
)
UPDATE user_balances ub
SET 
  balance = ub.balance + COALESCE(
    (SELECT balance 
     FROM user_balances ub2 
     WHERE ub2.asset_id = (SELECT id FROM btc_assets WHERE symbol = 'BTCX')
     AND ub2.user_id = ub.user_id),
    0
  ),
  updated_at = NOW()
WHERE ub.asset_id = (SELECT id FROM btc_assets WHERE symbol = 'BTC')
AND EXISTS (
  SELECT 1 
  FROM user_balances ub2 
  WHERE ub2.asset_id = (SELECT id FROM btc_assets WHERE symbol = 'BTCX')
  AND ub2.user_id = ub.user_id
);

-- Convert HONEYX to HONEY and handle HONEYPS
WITH honey_assets AS (
  SELECT id, symbol 
  FROM assets 
  WHERE symbol IN ('HONEY', 'HONEYX', 'HONEYPS')
)
UPDATE user_balances ub
SET 
  balance = ub.balance + COALESCE(
    (SELECT balance 
     FROM user_balances ub2 
     WHERE ub2.asset_id = (SELECT id FROM honey_assets WHERE symbol = 'HONEYX')
     AND ub2.user_id = ub.user_id),
    0
  ),
  updated_at = NOW()
WHERE ub.asset_id = (SELECT id FROM honey_assets WHERE symbol = 'HONEY')
AND EXISTS (
  SELECT 1 
  FROM user_balances ub2 
  WHERE ub2.asset_id = (SELECT id FROM honey_assets WHERE symbol = 'HONEYX')
  AND ub2.user_id = ub.user_id
);

-- Delete BTCX, HONEYX, BTCPS, and HONEYPS balances
DELETE FROM user_balances ub
USING assets a
WHERE ub.asset_id = a.id
AND a.symbol IN ('BTCX', 'HONEYX', 'BTCPS', 'HONEYPS');

COMMIT;

-- Now proceed with the rest of the migration...

-- First, update the BTCPS asset type
UPDATE assets 
SET type = 'pool_share'
WHERE symbol = 'BTCPS';

-- Drop existing view and trigger first
DROP VIEW IF EXISTS pool_ownership;
DROP TRIGGER IF EXISTS update_staking_positions_trigger ON transactions;
DROP FUNCTION IF EXISTS calculate_pool_ownership(UUID, UUID);
DROP FUNCTION IF EXISTS update_staking_positions();

-- Create function to calculate pool ownership percentage dynamically
CREATE OR REPLACE FUNCTION calculate_pool_ownership(
    p_user_id UUID,
    p_pool_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_user_shares DECIMAL := 0;
    v_total_shares DECIMAL := 0;
BEGIN
    -- Get user's share count (BTCPS/HONEYPS)
    SELECT COALESCE(ub.balance, 0)
    INTO v_user_shares
    FROM user_balances ub
    JOIN assets a ON a.id = ub.asset_id
    WHERE ub.user_id = p_user_id
    AND a.symbol IN ('BTCPS', 'HONEYPS');

    -- Get total shares in the pool
    SELECT COALESCE(pa.balance, 0)
    INTO v_total_shares
    FROM pool_assets pa
    JOIN assets a ON a.id = pa.asset_id
    WHERE pa.pool_id = p_pool_id
    AND a.symbol IN ('BTCPS', 'HONEYPS');

    -- Calculate ownership percentage
    IF v_total_shares > 0 THEN
        RETURN v_user_shares / v_total_shares;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create view for pool ownership
CREATE VIEW pool_ownership AS
WITH user_pool_shares AS (
    SELECT 
        ub.user_id,
        ub.balance as user_shares,
        pa.balance as total_shares,
        a.symbol
    FROM user_balances ub
    JOIN assets a ON a.id = ub.asset_id
    JOIN pool_assets pa ON pa.asset_id = a.id
    WHERE a.symbol IN ('BTCPS', 'HONEYPS')
)
SELECT 
    user_id,
    user_shares,
    total_shares,
    symbol
FROM user_pool_shares;

-- Recreate the update_staking_positions function
CREATE OR REPLACE FUNCTION update_staking_positions()
RETURNS TRIGGER AS $$
DECLARE
    v_pool_id UUID;
    v_pool_tvl DECIMAL;
    v_shares_asset_id UUID;
    v_shares_amount DECIMAL;
BEGIN
    IF NEW.type = 'stake' AND NEW.status = 'completed' THEN
        -- Get the appropriate pool ID and shares asset ID
        SELECT p.id, a.id INTO v_pool_id, v_shares_asset_id
        FROM pools p
        CROSS JOIN assets a
        WHERE p.type = (
            CASE 
                WHEN (SELECT symbol FROM assets WHERE id = NEW.asset_id) = 'BTC' THEN 'bitcoin'::pool_type
                WHEN (SELECT symbol FROM assets WHERE id = NEW.asset_id) = 'HONEY' THEN 'honey'::pool_type
            END
        )
        AND a.symbol = (
            CASE 
                WHEN (SELECT symbol FROM assets WHERE id = NEW.asset_id) = 'BTC' THEN 'BTCPS'
                WHEN (SELECT symbol FROM assets WHERE id = NEW.asset_id) = 'HONEY' THEN 'HONEYPS'
            END
        );

        -- Calculate shares amount (1:1 for now)
        v_shares_amount := NEW.amount;

        -- Update pool's main asset balance
        UPDATE pool_assets
        SET balance = balance + NEW.amount,
            updated_at = NOW()
        WHERE pool_id = v_pool_id
        AND asset_id = NEW.asset_id;

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
            v_shares_amount,
            NOW(),
            NOW()
        )
        ON CONFLICT (pool_id, asset_id)
        DO UPDATE SET
            balance = pool_assets.balance + v_shares_amount,
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
            v_shares_amount,
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id, asset_id)
        DO UPDATE SET
            balance = user_balances.balance + v_shares_amount,
            updated_at = NOW(),
            last_transaction_at = NOW();

        -- Update pool's TVL
        UPDATE pools
        SET total_value_locked = total_value_locked + (NEW.amount * NEW.price_per_token),
            updated_at = NOW()
        WHERE id = v_pool_id;

        -- Insert staking position record
        INSERT INTO staking_positions (
            id,
            user_id,
            pool_id,
            staked_amount,
            current_value,
            stake_timestamp,
            status,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            NEW.user_id,
            v_pool_id,
            NEW.amount,
            NEW.amount * NEW.price_per_token,
            NEW.created_at,
            'active',
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_staking_positions_trigger
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_staking_positions();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_pool_ownership(UUID, UUID) TO authenticated;
GRANT SELECT ON pool_ownership TO authenticated; 