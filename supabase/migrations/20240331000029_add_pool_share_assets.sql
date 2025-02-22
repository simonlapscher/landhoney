-- Add pool share assets if they don't exist
INSERT INTO assets (
    id,
    symbol,
    name,
    type,
    price_per_token,
    decimals,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'BTCPS',
    'Bitcoin Pool Shares',
    'pool_share',
    1, -- Price per token doesn't matter for pool shares
    8,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM assets WHERE symbol = 'BTCPS'
);

INSERT INTO assets (
    id,
    symbol,
    name,
    type,
    price_per_token,
    decimals,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'HONEYPS',
    'Honey Pool Shares',
    'pool_share',
    1, -- Price per token doesn't matter for pool shares
    8,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM assets WHERE symbol = 'HONEYPS'
);

-- Add pool_share as a valid asset type if it's not already in the enum
DO $$ 
BEGIN 
    ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'pool_share';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$; 