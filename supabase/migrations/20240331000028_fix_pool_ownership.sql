-- Create function to calculate pool ownership percentage dynamically
CREATE OR REPLACE FUNCTION calculate_pool_ownership(
    p_user_id UUID,
    p_pool_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_user_value DECIMAL := 0;
    v_pool_tvl DECIMAL := 0;
BEGIN
    -- Get user's total value in pool (sum of all active positions)
    SELECT COALESCE(SUM(sp.staked_amount * a.price_per_token), 0)
    INTO v_user_value
    FROM staking_positions sp
    JOIN pools p ON p.id = sp.pool_id
    JOIN assets a ON a.id = p.main_asset_id
    WHERE sp.user_id = p_user_id
    AND sp.pool_id = p_pool_id
    AND sp.status = 'active';

    -- Get pool's total value locked
    SELECT total_value_locked INTO v_pool_tvl
    FROM pools
    WHERE id = p_pool_id;

    -- Calculate ownership percentage
    IF v_pool_tvl > 0 THEN
        RETURN (v_user_value / v_pool_tvl) * 100;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a view to expose pool ownership information
CREATE OR REPLACE VIEW pool_ownership AS
WITH user_pool_values AS (
    SELECT 
        sp.user_id,
        sp.pool_id,
        p.type as pool_type,
        SUM(sp.staked_amount * a.price_per_token) as user_value,
        p.total_value_locked as pool_tvl
    FROM staking_positions sp
    JOIN pools p ON p.id = sp.pool_id
    JOIN assets a ON a.id = p.main_asset_id
    WHERE sp.status = 'active'
    GROUP BY sp.user_id, sp.pool_id, p.type, p.total_value_locked
)
SELECT 
    user_id,
    pool_id,
    pool_type,
    user_value,
    pool_tvl,
    CASE 
        WHEN pool_tvl > 0 THEN
            (user_value / pool_tvl) * 100
        ELSE 0
    END as ownership_percentage
FROM user_pool_values;

-- Update the staking positions trigger function
CREATE OR REPLACE FUNCTION update_staking_positions()
RETURNS TRIGGER AS $$
DECLARE
    v_pool_id UUID;
    v_pool_tvl DECIMAL;
    v_ownership_percentage DECIMAL;
BEGIN
    IF NEW.type = 'stake' AND NEW.status = 'completed' THEN
        -- Get the appropriate pool ID
        SELECT id INTO v_pool_id
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

        -- Calculate ownership percentage
        IF v_pool_tvl > 0 THEN
            v_ownership_percentage := (NEW.amount * NEW.price_per_token / v_pool_tvl) * 100;
        ELSE
            v_ownership_percentage := 100; -- First stake owns 100%
        END IF;

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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_pool_ownership(UUID, UUID) TO authenticated;
GRANT SELECT ON pool_ownership TO authenticated; 