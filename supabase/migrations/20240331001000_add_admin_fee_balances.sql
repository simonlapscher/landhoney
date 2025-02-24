-- Create admin fee balances table
CREATE TABLE admin_fee_balances (
    asset_id UUID REFERENCES assets(id),
    balance DECIMAL NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (asset_id)
);

-- Add initial USD balance record
INSERT INTO admin_fee_balances (asset_id, balance)
SELECT id, 0
FROM assets
WHERE symbol = 'USD'; 