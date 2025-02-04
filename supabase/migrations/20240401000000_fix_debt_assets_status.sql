-- Drop existing type if it exists
DROP TYPE IF EXISTS debt_asset_status CASCADE;

-- Create the status enum type with lowercase values
CREATE TYPE debt_asset_status AS ENUM ('pending', 'funding', 'funded', 'completed', 'defaulted');

-- Alter the debt_assets table to use the new type
ALTER TABLE debt_assets 
  ALTER COLUMN status TYPE debt_asset_status 
  USING status::text::debt_asset_status;

-- Add RLS policies for debt_assets
ALTER TABLE debt_assets ENABLE ROW LEVEL SECURITY;

-- Allow admins to insert/update debt_assets
CREATE POLICY "Enable insert for admins only" ON debt_assets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.user_metadata->>'is_admin' = 'true'
        )
    );

CREATE POLICY "Enable update for admins only" ON debt_assets
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.user_metadata->>'is_admin' = 'true'
        )
    );

-- Allow all authenticated users to view debt_assets
CREATE POLICY "Enable read access for all users" ON debt_assets
    FOR SELECT
    TO authenticated
    USING (true);

-- Add storage policies for asset files
INSERT INTO storage.policies (name, definition)
VALUES
  ('Admin Asset Upload Policy',
   jsonb_build_object(
     'role', 'authenticated',
     'match', jsonb_build_object(
       'metadata', jsonb_build_object(
         'is_admin', 'true'
       )
     ),
     'insert', true,
     'update', true,
     'delete', true
   )
  )
ON CONFLICT (name) DO UPDATE
SET definition = EXCLUDED.definition; 