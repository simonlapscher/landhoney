-- Check image URLs for the latest asset
SELECT 
    a.id,
    a.name,
    a.main_image,
    da.images
FROM assets a
JOIN debt_assets da ON da.asset_id = a.id
ORDER BY a.created_at DESC
LIMIT 1; 