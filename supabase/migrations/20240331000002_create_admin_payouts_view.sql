-- Create a view for admins to see all payouts with detailed information
CREATE OR REPLACE VIEW admin_payouts_view AS
SELECT 
    ldp.id as payment_id,
    ldp.created_at as payment_date,
    ldp.user_id,
    ldp.asset_id,
    u.email as user_email,
    ldp.usd_amount,
    ldp.honey_amount,
    ldp.days_held_in_period,
    ldp.user_balance_during_period as average_balance,
    ld.distribution_period_start,
    ld.distribution_period_end,
    a.name as asset_name,
    a.symbol as asset_symbol,
    a.type as asset_type,
    da.loan_amount,
    da.apr
FROM loan_distribution_payments ldp
JOIN loan_distributions ld ON ld.id = ldp.distribution_id
JOIN debt_assets da ON da.asset_id = ldp.asset_id
JOIN assets a ON a.id = ldp.asset_id
JOIN auth.users u ON u.id = ldp.user_id
ORDER BY ldp.created_at DESC;

-- Create indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_loan_distribution_payments_user_id 
ON loan_distribution_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_loan_distribution_payments_asset_id 
ON loan_distribution_payments(asset_id);

CREATE INDEX IF NOT EXISTS idx_loan_distribution_payments_created_at 
ON loan_distribution_payments(created_at);

-- Create a function to get filtered payouts
CREATE OR REPLACE FUNCTION get_filtered_payouts(
    p_asset_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    payment_id UUID,
    payment_date TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    asset_id UUID,
    user_email TEXT,
    usd_amount DECIMAL,
    honey_amount DECIMAL,
    days_held_in_period INTEGER,
    average_balance DECIMAL,
    distribution_period_start TIMESTAMP WITH TIME ZONE,
    distribution_period_end TIMESTAMP WITH TIME ZONE,
    asset_name TEXT,
    asset_symbol TEXT,
    asset_type TEXT,
    loan_amount DECIMAL,
    apr DECIMAL
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM admin_payouts_view
    WHERE 
        (p_asset_id IS NULL OR asset_id = p_asset_id)
        AND (p_user_id IS NULL OR user_id = p_user_id)
        AND (p_start_date IS NULL OR payment_date >= p_start_date)
        AND (p_end_date IS NULL OR payment_date <= p_end_date)
    ORDER BY payment_date DESC;
$$; 