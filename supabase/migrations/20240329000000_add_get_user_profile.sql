-- Create function to get user profile that bypasses RLS
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE user_id = p_user_id
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$; 