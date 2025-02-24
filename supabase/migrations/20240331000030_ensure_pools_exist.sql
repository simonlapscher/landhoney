-- First, ensure the pool_type enum exists and has the correct values
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pool_type') THEN
        CREATE TYPE pool_type AS ENUM ('bitcoin', 'honey');
    END IF;
END $$;

-- Get the asset IDs for HONEY and BTC
WITH asset_ids AS (
    SELECT id, symbol, price_per_token
    FROM assets
    WHERE symbol IN ('HONEY', 'BTC')
)
-- Insert pools if they don't exist
INSERT INTO pools (
    id,
    type,
    main_asset_id,
    apr,
    max_size,
    is_paused,
    total_value_locked,
    created_at,
    updated_at
)
SELECT 
    COALESCE(
        (SELECT id FROM pools WHERE type = CASE 
            WHEN a.symbol = 'HONEY' THEN 'honey'::pool_type
            WHEN a.symbol = 'BTC' THEN 'bitcoin'::pool_type
        END),
        gen_random_uuid()
    ),
    CASE 
        WHEN a.symbol = 'HONEY' THEN 'honey'::pool_type
        WHEN a.symbol = 'BTC' THEN 'bitcoin'::pool_type
    END,
    a.id,
    CASE 
        WHEN a.symbol = 'HONEY' THEN 8.8  -- 8.8% APR for honey pool
        WHEN a.symbol = 'BTC' THEN 9.5    -- 9.5% APR for bitcoin pool
    END,
    1000000000, -- $1B max size
    false,      -- not paused
    0,          -- initial TVL
    NOW(),
    NOW()
FROM asset_ids a
WHERE NOT EXISTS (
    SELECT 1 
    FROM pools p 
    WHERE p.type = CASE 
        WHEN a.symbol = 'HONEY' THEN 'honey'::pool_type
        WHEN a.symbol = 'BTC' THEN 'bitcoin'::pool_type
    END
)
ON CONFLICT (type) DO UPDATE
SET 
    main_asset_id = EXCLUDED.main_asset_id,
    apr = EXCLUDED.apr,
    updated_at = NOW();

-- Ensure pool share assets exist
INSERT INTO assets (
    id,
    symbol,
    name,
    description,
    price_per_token,
    is_stable,
    is_pool_share,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    CASE 
        WHEN a.symbol = 'HONEY' THEN 'HONEYPS'
        WHEN a.symbol = 'BTC' THEN 'BTCPS'
    END,
    CASE 
        WHEN a.symbol = 'HONEY' THEN 'Honey Pool Share'
        WHEN a.symbol = 'BTC' THEN 'Bitcoin Pool Share'
    END,
    CASE 
        WHEN a.symbol = 'HONEY' THEN 'Honey Pool Share Token'
        WHEN a.symbol = 'BTC' THEN 'Bitcoin Pool Share Token'
    END,
    a.price_per_token, -- Share tokens have same price as underlying
    false,
    true,
    NOW(),
    NOW()
FROM asset_ids a
WHERE NOT EXISTS (
    SELECT 1 
    FROM assets 
    WHERE symbol = CASE 
        WHEN a.symbol = 'HONEY' THEN 'HONEYPS'
        WHEN a.symbol = 'BTC' THEN 'BTCPS'
    END
); 