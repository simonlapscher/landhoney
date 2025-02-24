-- Drop existing views if they exist
DROP VIEW IF EXISTS portfolio_balances;
DROP VIEW IF EXISTS portfolio_totals;

-- Create view for portfolio balances (excluding pool shares)
CREATE VIEW portfolio_balances AS
SELECT 
    ub.id,
    ub.user_id,
    ub.asset_id,
    ub.balance,
    ub.total_interest_earned,
    ub.created_at,
    ub.updated_at,
    ub.last_transaction_at,
    a.name,
    a.symbol,
    a.type,
    a.price_per_token,
    a.main_image,
    CASE 
        WHEN a.symbol IN ('BTCPS', 'HONEYPS') THEN 0
        ELSE ub.balance * a.price_per_token 
    END as total_value
FROM user_balances ub
JOIN assets a ON a.id = ub.asset_id
WHERE a.symbol NOT IN ('BTCPS', 'HONEYPS');

-- Create view for portfolio totals by type
CREATE VIEW portfolio_totals AS
SELECT 
    user_id,
    type,
    COUNT(*) as asset_count,
    SUM(balance) as total_tokens,
    SUM(total_value) as total_value
FROM portfolio_balances
GROUP BY user_id, type;

-- Create function to get user portfolio summary
CREATE OR REPLACE FUNCTION get_user_portfolio_summary(p_user_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_total_value DECIMAL;
    v_debt_value DECIMAL;
    v_commodity_value DECIMAL;
    v_cash_value DECIMAL;
BEGIN
    -- Get totals by type
    SELECT 
        COALESCE(SUM(total_value), 0),
        COALESCE(SUM(CASE WHEN type = 'debt' THEN total_value ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'commodity' THEN total_value ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'cash' THEN total_value ELSE 0 END), 0)
    INTO v_total_value, v_debt_value, v_commodity_value, v_cash_value
    FROM portfolio_balances
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'total_value', v_total_value,
        'debt_value', v_debt_value,
        'commodity_value', v_commodity_value,
        'cash_value', v_cash_value
    );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON portfolio_balances TO authenticated;
GRANT SELECT ON portfolio_totals TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_portfolio_summary TO authenticated; 