-- Update price_per_token for all debt assets to $1.00
UPDATE assets a
SET price_per_token = 1.00
FROM debt_assets da
WHERE da.asset_id = a.id
  AND a.type = 'debt'; 