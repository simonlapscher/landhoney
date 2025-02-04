-- Add a temporary text column
ALTER TABLE debt_assets ADD COLUMN temp_status text;

-- Copy current status values to temp column
UPDATE debt_assets SET temp_status = status::text;

-- Drop the status column and the old enum type
ALTER TABLE debt_assets DROP COLUMN status;
DROP TYPE IF EXISTS debt_asset_status CASCADE;

-- Create new enum type
CREATE TYPE debt_asset_status AS ENUM ('FUNDING', 'FUNDED', 'COMPLETED', 'DEFAULTED');

-- Add new status column with the enum type
ALTER TABLE debt_assets ADD COLUMN status debt_asset_status;

-- Convert and copy values from temp to new status column
UPDATE debt_assets 
SET status = CASE UPPER(temp_status)
    WHEN 'PENDING' THEN 'FUNDING'::debt_asset_status
    WHEN 'FUNDING' THEN 'FUNDING'::debt_asset_status
    WHEN 'FUNDED' THEN 'FUNDED'::debt_asset_status
    WHEN 'COMPLETED' THEN 'COMPLETED'::debt_asset_status
    WHEN 'DEFAULTED' THEN 'DEFAULTED'::debt_asset_status
    ELSE 'FUNDING'::debt_asset_status
END;

-- Drop the temporary column
ALTER TABLE debt_assets DROP COLUMN temp_status;

-- Make status column NOT NULL if it was before
ALTER TABLE debt_assets ALTER COLUMN status SET NOT NULL; 