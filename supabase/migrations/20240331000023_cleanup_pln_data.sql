-- First, get the PLN asset ID
DO $$ 
DECLARE
    v_pln_asset_id UUID;
BEGIN
    -- Get the PLN asset ID
    SELECT id INTO v_pln_asset_id
    FROM assets
    WHERE symbol = 'PLN';

    IF v_pln_asset_id IS NOT NULL THEN
        -- Delete any user balances for PLN
        DELETE FROM user_balances
        WHERE asset_id = v_pln_asset_id;

        -- Delete any pool assets entries for PLN
        DELETE FROM pool_assets
        WHERE asset_id = v_pln_asset_id;

        -- Delete any transactions involving PLN
        DELETE FROM transactions
        WHERE asset_id = v_pln_asset_id;

        -- Finally, delete the PLN asset
        DELETE FROM assets
        WHERE id = v_pln_asset_id;
    END IF;
END $$; 