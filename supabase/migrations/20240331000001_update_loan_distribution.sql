-- Update the distribute_loan_payments function to include the debt asset's metadata
CREATE OR REPLACE FUNCTION distribute_loan_payments(p_distribution_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_asset_id UUID;
    v_start_date TIMESTAMP WITH TIME ZONE;
    v_end_date TIMESTAMP WITH TIME ZONE;
    v_distribution_amount DECIMAL;
    v_loan_amount DECIMAL;
    v_apr DECIMAL;
    v_days INTEGER;
    v_total_dollar_days DECIMAL;
    v_interest_for_period DECIMAL;
    v_honey_price DECIMAL;
    v_debt_asset_name TEXT;
    v_debt_asset_symbol TEXT;
    v_debt_asset_main_image TEXT;
BEGIN
    -- Get distribution details and debt asset info
    SELECT 
        d.asset_id,
        d.distribution_period_start,
        d.distribution_period_end,
        d.total_distribution_amount,
        da.loan_amount,
        da.apr,
        a.price_per_token as honey_price,
        a2.name as debt_asset_name,
        a2.symbol as debt_asset_symbol,
        a2.main_image as debt_asset_main_image
    INTO 
        v_asset_id,
        v_start_date,
        v_end_date,
        v_distribution_amount,
        v_loan_amount,
        v_apr,
        v_honey_price,
        v_debt_asset_name,
        v_debt_asset_symbol,
        v_debt_asset_main_image
    FROM loan_distributions d
    JOIN debt_assets da ON da.asset_id = d.asset_id
    JOIN assets a ON a.symbol = 'HONEY'
    JOIN assets a2 ON a2.id = d.asset_id
    WHERE d.id = p_distribution_id;

    -- Calculate days in period
    v_days := (v_end_date::DATE - v_start_date::DATE) + 1;

    -- Calculate interest for period using day-count approach
    v_interest_for_period := (v_loan_amount * (v_apr / 100.0) * (v_days::DECIMAL / 365.0)) / 100.0;

    -- Process all distributions in a single transaction
    WITH holdings AS (
        SELECT * FROM calculate_user_holdings(v_asset_id, v_start_date, v_end_date)
    ),
    payments AS (
        INSERT INTO loan_distribution_payments (
            distribution_id,
            user_id,
            asset_id,
            user_balance_during_period,
            days_held_in_period,
            usd_amount,
            honey_amount
        )
        SELECT 
            p_distribution_id,
            h.user_id,
            v_asset_id,
            h.average_balance,
            h.days_held,
            ROUND((v_interest_for_period * h.share_of_distribution)::numeric, 2) as usd_amount,
            ROUND((v_interest_for_period * h.share_of_distribution / v_honey_price)::numeric, 4) as honey_amount
        FROM holdings h
        RETURNING *
    ),
    transactions AS (
        INSERT INTO transactions (
            user_id,
            asset_id,
            type,
            amount,
            price_per_token,
            status,
            metadata
        )
        SELECT 
            p.user_id,
            '7582ecb5-6b54-435c-9714-2c51a9755025', -- HONEY asset_id
            'loan_distribution'::transaction_type,
            p.honey_amount,
            v_honey_price,
            'completed',
            jsonb_build_object(
                'distribution_id', p_distribution_id,
                'distribution_type', 'loan_distribution',
                'debt_asset_name', v_debt_asset_name,
                'debt_asset_symbol', v_debt_asset_symbol,
                'source_asset_id', v_asset_id,
                'source_asset_main_image', v_debt_asset_main_image,
                'usd_amount', p.usd_amount,
                'days_held', p.days_held_in_period,
                'interest_for_period', v_interest_for_period,
                'total_dollar_days', h.total_dollar_days,
                'user_owned_fraction', h.share_of_distribution
            )
        FROM payments p
        JOIN holdings h ON h.user_id = p.user_id
        RETURNING *
    )
    INSERT INTO user_balances (
        user_id,
        asset_id,
        balance,
        total_interest_earned
    )
    SELECT 
        p.user_id,
        '7582ecb5-6b54-435c-9714-2c51a9755025', -- HONEY asset_id
        SUM(p.honey_amount),
        SUM(p.usd_amount)
    FROM payments p
    GROUP BY p.user_id
    ON CONFLICT (user_id, asset_id) 
    DO UPDATE SET 
        balance = user_balances.balance + EXCLUDED.balance,
        total_interest_earned = user_balances.total_interest_earned + EXCLUDED.total_interest_earned;

END;
$$; 