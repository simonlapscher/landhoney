-- Drop the view first
DROP VIEW IF EXISTS admin_transactions;

-- Rename term_months to duration_months in debt_assets table
ALTER TABLE debt_assets RENAME COLUMN term_months TO duration_months;

-- Update the comment on the column
COMMENT ON COLUMN debt_assets.duration_months IS 'Duration of the loan in months';

-- Recreate the view with the new column name
CREATE VIEW admin_transactions AS
SELECT 
  t.id,
  t.created_at,
  t.updated_at,
  t.user_id,
  t.asset_id,
  t.type,
  t.amount,
  t.price_per_token,
  t.status,
  t.completed_at,
  t.cancelled_at,
  t.metadata,
  a.name AS asset_name,
  a.symbol AS asset_symbol,
  a.type AS asset_type,
  u.email AS user_email,
  (t.metadata->>'payment_method')::text AS payment_method
FROM transactions t
JOIN assets a ON t.asset_id = a.id
JOIN auth.users u ON t.user_id = u.id
WHERE t.status = 'pending';

-- Grant necessary permissions on the recreated view
GRANT SELECT ON admin_transactions TO authenticated; 