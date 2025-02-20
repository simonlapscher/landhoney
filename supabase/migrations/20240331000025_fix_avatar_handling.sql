-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_profile_avatar(UUID, TEXT);

-- Create function to update profile avatar
CREATE OR REPLACE FUNCTION update_profile_avatar(
    p_user_id UUID,
    p_avatar_url TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles
    SET 
        avatar_url = p_avatar_url,
        updated_at = NOW()
    WHERE user_id = p_user_id
    AND (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND is_admin = true
    ));

    RETURN (
        SELECT json_build_object(
            'id', id,
            'user_id', user_id,
            'avatar_url', avatar_url
        )
        FROM profiles
        WHERE user_id = p_user_id
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_profile_avatar(UUID, TEXT) TO authenticated;

-- Ensure avatar_url column exists and is properly indexed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- Create index on avatar_url for better query performance
CREATE INDEX IF NOT EXISTS profiles_avatar_url_idx ON profiles (avatar_url);

-- Update the pollen leaderboard view to ensure it includes avatar_url
DROP VIEW IF EXISTS pollen_leaderboard;
CREATE VIEW pollen_leaderboard AS
SELECT 
    pb.user_id,
    COALESCE(p.bee_name, u.email) as bee_name,
    p.avatar_url,
    pb.current_period_balance as current_period_pollen,
    pb.total_balance as total_pollen,
    RANK() OVER (ORDER BY pb.current_period_balance DESC) as current_period_rank,
    RANK() OVER (ORDER BY pb.total_balance DESC) as all_time_rank
FROM pollen_balances pb
LEFT JOIN profiles p ON p.user_id = pb.user_id
JOIN auth.users u ON u.id = pb.user_id
WHERE pb.current_period_balance > 0 OR pb.total_balance > 0; 