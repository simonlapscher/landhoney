-- Check details for DEBT7
SELECT 
    a.id,
    a.name,
    a.symbol,
    a.main_image,
    a.price_per_token,
    da.images,
    da.status
FROM assets a
JOIN debt_assets da ON da.asset_id = a.id
WHERE a.symbol = 'DEBT7'; 