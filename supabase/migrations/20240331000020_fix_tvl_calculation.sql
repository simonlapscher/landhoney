-- Drop the TVL update trigger and function
DROP TRIGGER IF EXISTS update_tvl_after_transaction_trigger ON transactions;
DROP FUNCTION IF EXISTS update_tvl_after_transaction();

-- Create or replace the recalculate_pool_tvl function to ensure accurate TVL calculation
CREATE OR REPLACE FUNCTION recalculate_pool_tvl(p_pool_id UUID)
RETURNS void AS $$
DECLARE
    v_total_value DECIMAL := 0;
BEGIN
    -- Calculate total value of all assets in the pool
    SELECT COALESCE(SUM(pa.balance * a.price_per_token), 0)
    INTO v_total_value
    FROM pool_assets pa
    JOIN assets a ON a.id = pa.asset_id
    WHERE pa.pool_id = p_pool_id;

    -- Update pool's TVL
    UPDATE pools
    SET 
        total_value_locked = v_total_value,
        updated_at = NOW()
    WHERE id = p_pool_id;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the update_staking_positions trigger function
CREATE OR REPLACE FUNCTION update_staking_positions()
RETURNS TRIGGER AS $$
DECLARE
    v_pool_id UUID;
    v_pool_tvl DECIMAL;
    v_ownership_percentage DECIMAL;
BEGIN
    IF NEW.type = 'stake' AND NEW.status = 'completed' THEN
        -- Get the appropriate pool ID and TVL
        SELECT id, total_value_locked 
        INTO v_pool_id, v_pool_tvl
        FROM pools
        WHERE type = (
            CASE 
                WHEN (SELECT symbol FROM assets WHERE id = NEW.asset_id) = 'BTC' THEN 'bitcoin'::pool_type
                WHEN (SELECT symbol FROM assets WHERE id = NEW.asset_id) = 'HONEY' THEN 'honey'::pool_type
            END
        );

        -- Update pool's asset balance first
        UPDATE pool_assets
        SET balance = balance + NEW.amount,
            updated_at = NOW()
        WHERE pool_id = v_pool_id
        AND asset_id = NEW.asset_id;

        -- Recalculate pool TVL
        PERFORM recalculate_pool_tvl(v_pool_id);

        -- Get updated TVL for ownership calculation
        SELECT total_value_locked INTO v_pool_tvl
        FROM pools
        WHERE id = v_pool_id;

        -- Calculate ownership percentage based on stake value
        v_ownership_percentage := CASE 
            WHEN v_pool_tvl > 0 THEN
                (NEW.amount * NEW.price_per_token) / v_pool_tvl
            ELSE
                1  -- If this is the first stake, they own 100%
            END;

        -- Insert new staking position
        INSERT INTO staking_positions (
            id,
            user_id,
            pool_id,
            staked_amount,
            current_value,
            ownership_percentage,
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
            v_ownership_percentage,
            NEW.created_at,
            'active',
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 