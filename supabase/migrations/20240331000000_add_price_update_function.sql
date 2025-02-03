-- Modify price_history table to use user_id instead of updated_by
ALTER TABLE price_history 
DROP CONSTRAINT IF EXISTS price_history_updated_by_fkey,
DROP COLUMN IF EXISTS updated_by,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create function to update asset price and record history
CREATE OR REPLACE FUNCTION update_asset_price(
  p_asset_id UUID,
  p_new_price DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_asset_symbol TEXT;
  v_honeyx_id UUID;
BEGIN
  -- Get the user ID
  SELECT auth.uid() INTO v_user_id;
  
  -- Verify admin status
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = v_user_id 
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User is not an admin';
  END IF;

  -- Get the asset symbol
  SELECT symbol INTO v_asset_symbol
  FROM assets
  WHERE id = p_asset_id;

  -- Update the asset price
  UPDATE assets 
  SET 
    price_per_token = p_new_price,
    updated_at = NOW()
  WHERE id = p_asset_id;

  -- Record the price change in history
  INSERT INTO price_history (
    asset_id,
    price,
    user_id,
    created_at
  ) VALUES (
    p_asset_id,
    p_new_price,
    v_user_id,
    NOW()
  );

  -- If this is HONEY, also update HONEYX
  IF v_asset_symbol = 'HONEY' THEN
    -- Get HONEYX asset ID
    SELECT id INTO v_honeyx_id
    FROM assets
    WHERE symbol = 'HONEYX';

    -- Update HONEYX price
    UPDATE assets 
    SET 
      price_per_token = p_new_price,
      updated_at = NOW()
    WHERE id = v_honeyx_id;

    -- Record HONEYX price change in history
    INSERT INTO price_history (
      asset_id,
      price,
      user_id,
      created_at
    ) VALUES (
      v_honeyx_id,
      p_new_price,
      v_user_id,
      NOW()
    );
  END IF;
END;
$$; 