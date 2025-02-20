-- Drop PLN from assets table if it exists
DELETE FROM assets WHERE symbol = 'PLN';

-- Create pollen_balances table
CREATE TABLE pollen_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_period_balance DECIMAL DEFAULT 0,
    total_balance DECIMAL DEFAULT 0,
    last_earned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create pollen_distributions table to track history
CREATE TABLE pollen_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    distribution_type TEXT NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to award pollen
CREATE OR REPLACE FUNCTION award_pollen(
    p_user_id UUID,
    p_amount DECIMAL,
    p_distribution_type TEXT,
    p_period_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS pollen_distributions AS $$
DECLARE
    v_distribution pollen_distributions;
BEGIN
    -- Create or update pollen balance
    INSERT INTO pollen_balances (user_id, current_period_balance, total_balance, last_earned_at)
    VALUES (p_user_id, p_amount, p_amount, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        current_period_balance = pollen_balances.current_period_balance + p_amount,
        total_balance = pollen_balances.total_balance + p_amount,
        last_earned_at = NOW(),
        updated_at = NOW();

    -- Record distribution
    INSERT INTO pollen_distributions (
        user_id,
        amount,
        distribution_type,
        period_start,
        period_end,
        metadata
    )
    VALUES (
        p_user_id,
        p_amount,
        p_distribution_type,
        p_period_start,
        p_period_end,
        p_metadata
    )
    RETURNING * INTO v_distribution;

    RETURN v_distribution;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing view if it exists
DROP VIEW IF EXISTS pollen_leaderboard;

-- Create view for pollen leaderboard
CREATE VIEW pollen_leaderboard AS
SELECT 
    pb.user_id,
    COALESCE(p.bee_name, u.email) as bee_name,
    p.avatar_url,
    pb.current_period_balance as current_period_pollen,
    pb.total_balance as total_pollen,
    RANK() OVER (ORDER BY pb.current_period_balance DESC) as current_rank,
    RANK() OVER (ORDER BY pb.total_balance DESC) as all_time_rank
FROM pollen_balances pb
LEFT JOIN profiles p ON p.user_id = pb.user_id
JOIN auth.users u ON u.id = pb.user_id
WHERE pb.current_period_balance > 0 OR pb.total_balance > 0;

-- Grant necessary permissions
GRANT SELECT ON pollen_leaderboard TO authenticated;
GRANT SELECT ON pollen_balances TO authenticated;
GRANT SELECT ON pollen_distributions TO authenticated;
GRANT EXECUTE ON FUNCTION award_pollen TO authenticated; 