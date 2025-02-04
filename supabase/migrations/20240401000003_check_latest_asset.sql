-- Check the latest asset and its debt details
SELECT 
    a.id,
    a.name,
    a.symbol,
    a.type,
    a.price_per_token,
    a.token_supply,
    a.min_investment,
    a.max_investment,
    a.created_at,
    da.loan_amount,
    da.apr,
    da.term_months,
    da.status,
    da.address,
    da.city,
    da.state,
    da.zip_code,
    da.appraised_value,
    da.loan_maturity_date,
    da.funding_goal,
    da.images,
    da.documents
FROM assets a
JOIN debt_assets da ON da.asset_id = a.id
ORDER BY a.created_at DESC
LIMIT 1; 