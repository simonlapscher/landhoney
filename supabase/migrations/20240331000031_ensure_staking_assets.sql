-- First, ensure the pool_type enum exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pool_type') THEN
        CREATE TYPE pool_type AS ENUM ('bitcoin', 'honey');
    END IF;
END $$;

-- Add pool_share as a valid asset type if it's not already in the enum
DO $$ 
BEGIN 
    ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'pool_share';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Get the HONEY asset ID
WITH honey_asset AS (
    SELECT id, price_per_token
    FROM assets
    WHERE symbol = 'HONEY'
)
-- Ensure HONEYPS exists
INSERT INTO assets (
    id,
    symbol,
    name,
    type,
    description,
    price_per_token,
    decimals,
    token_supply,
    min_investment,
    max_investment,
    is_pool_share,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'HONEYPS',
    'Honey Pool Shares',
    'pool_share',
    'Internal pool share token for Honey staking pool',
    ha.price_per_token,
    8,
    1000000000, -- 1B token supply
    0.00000001, -- Minimum investment
    1000000000, -- Maximum investment (1B)
    true,
    NOW(),
    NOW()
FROM honey_asset ha
WHERE NOT EXISTS (
    SELECT 1 FROM assets WHERE symbol = 'HONEYPS'
);

-- Ensure honey pool exists
WITH honey_asset AS (
    SELECT id, price_per_token
    FROM assets
    WHERE symbol = 'HONEY'
)
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
        (SELECT id FROM pools WHERE type = 'honey'::pool_type),
        gen_random_uuid()
    ),
    'honey'::pool_type,
    ha.id,
    8.8,  -- 8.8% APR for honey pool
    1000000000, -- $1B max size
    false,      -- not paused
    0,          -- initial TVL
    NOW(),
    NOW()
FROM honey_asset ha
WHERE NOT EXISTS (
    SELECT 1 FROM pools WHERE type = 'honey'::pool_type
)
ON CONFLICT (type) DO UPDATE
SET 
    main_asset_id = EXCLUDED.main_asset_id,
    apr = EXCLUDED.apr,
    updated_at = NOW(); 