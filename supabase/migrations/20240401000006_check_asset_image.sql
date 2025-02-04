-- Check main_image URL for the latest asset
SELECT 
    a.id,
    a.name,
    a.symbol,
    a.main_image,
    a.price_per_token
FROM assets a
WHERE a.id = (
    SELECT asset_id 
    FROM debt_assets 
    ORDER BY created_at DESC 
    LIMIT 1
); 