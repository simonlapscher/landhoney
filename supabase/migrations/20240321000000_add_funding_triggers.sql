-- Create function to update debt asset funding amounts
CREATE OR REPLACE FUNCTION update_debt_asset_funding()
RETURNS TRIGGER AS $$
DECLARE
  v_asset_id UUID;
  v_total_funded NUMERIC;
BEGIN
  -- Get the asset_id for this balance change
  SELECT asset_id INTO v_asset_id
  FROM assets a
  JOIN debt_assets da ON da.asset_id = a.id
  WHERE a.id = NEW.asset_id AND a.type = 'debt';
  
  -- If this is a debt asset, update its funding amounts
  IF v_asset_id IS NOT NULL THEN
    -- Calculate total funded amount from all user balances
    SELECT COALESCE(SUM(balance), 0) INTO v_total_funded
    FROM user_balances
    WHERE asset_id = v_asset_id;
    
    -- Update the debt asset funding amounts
    UPDATE debt_assets
    SET 
      funded_amount = v_total_funded,
      remaining_amount = funding_goal - v_total_funded
    WHERE asset_id = v_asset_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_debt_asset_funding_trigger ON user_balances;

-- Create trigger
CREATE TRIGGER update_debt_asset_funding_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_debt_asset_funding();

-- Update all debt assets with current funding amounts from user balances
UPDATE debt_assets da
SET 
  funded_amount = COALESCE(
    (
      SELECT SUM(balance)
      FROM user_balances ub
      WHERE ub.asset_id = da.asset_id
    ), 
    0
  ),
  remaining_amount = funding_goal - COALESCE(
    (
      SELECT SUM(balance)
      FROM user_balances ub
      WHERE ub.asset_id = da.asset_id
    ),
    0
  ); 
