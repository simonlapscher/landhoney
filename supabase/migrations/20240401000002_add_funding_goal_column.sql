-- Add funding_goal column to debt_assets table
ALTER TABLE debt_assets 
ADD COLUMN IF NOT EXISTS funding_goal numeric NOT NULL DEFAULT 0; 