-- Drop existing view and function
DROP VIEW IF EXISTS pool_ownership;
DROP FUNCTION IF EXISTS calculate_pool_ownership(UUID, UUID);

-- Create function to calculate pool ownership percentage dynamically
CREATE OR REPLACE FUNCTION calculate_pool_ownership(
    p_user_id UUID,
    p_pool_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_user_shares DECIMAL := 0;
    v_total_shares DECIMAL := 0;
    v_pool_share_asset_id UUID;
BEGIN
    -- Get the correct pool share asset ID based on pool type
    SELECT a.id INTO v_pool_share_asset_id
    FROM assets a
    JOIN pools p ON p.type = CASE 
        WHEN a.symbol = 'BTCPS' THEN 'bitcoin'::pool_type
        WHEN a.symbol = 'HONEYPS' THEN 'honey'::pool_type
    END
    WHERE p.id = p_pool_id
    AND a.symbol IN ('BTCPS', 'HONEYPS');

    -- Get user's share count for this specific pool
    SELECT COALESCE(ub.balance, 0)
    INTO v_user_shares
    FROM user_balances ub
    WHERE ub.user_id = p_user_id
    AND ub.asset_id = v_pool_share_asset_id;

    -- Get total shares in this specific pool
    SELECT COALESCE(pa.balance, 0)
    INTO v_total_shares
    FROM pool_assets pa
    WHERE pa.pool_id = p_pool_id
    AND pa.asset_id = v_pool_share_asset_id;

    -- Calculate ownership percentage
    IF v_total_shares > 0 THEN
        RETURN (v_user_shares / v_total_shares) * 100;  -- Return as percentage
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create view for pool ownership
CREATE VIEW pool_ownership AS
WITH pool_share_assets AS (
    SELECT 
        p.id as pool_id,
        p.type as pool_type,
        a.id as share_asset_id,
        a.symbol as share_symbol
    FROM pools p
    CROSS JOIN assets a
    WHERE (p.type = 'bitcoin' AND a.symbol = 'BTCPS')
    OR (p.type = 'honey' AND a.symbol = 'HONEYPS')
),
user_pool_shares AS (
    SELECT 
        ub.user_id,
        psa.pool_id,
        psa.pool_type,
        psa.share_symbol,
        COALESCE(ub.balance, 0) as user_shares,
        COALESCE(pa.balance, 0) as total_shares
    FROM pool_share_assets psa
    LEFT JOIN user_balances ub ON ub.asset_id = psa.share_asset_id
    LEFT JOIN pool_assets pa ON pa.pool_id = psa.pool_id AND pa.asset_id = psa.share_asset_id
)
SELECT 
    user_id,
    pool_id,
    pool_type,
    share_symbol,
    user_shares,
    total_shares,
    CASE 
        WHEN total_shares > 0 THEN (user_shares / total_shares) * 100
        ELSE 0
    END as ownership_percentage
FROM user_pool_shares;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_pool_ownership(UUID, UUID) TO authenticated;
GRANT SELECT ON pool_ownership TO authenticated; 