-- Add bee_name column to profiles table
ALTER TABLE profiles ADD COLUMN bee_name TEXT;

-- Add unique index for bee_name
CREATE UNIQUE INDEX profiles_bee_name_unique_idx ON profiles (LOWER(bee_name)) WHERE bee_name IS NOT NULL;

-- Create function to check if bee name is available
CREATE OR REPLACE FUNCTION check_bee_name_available(p_bee_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE LOWER(bee_name) = LOWER(p_bee_name)
  );
END;
$$;

-- Update the update_profile_display_name function to handle bee_name
CREATE OR REPLACE FUNCTION update_profile_display_name(
  p_user_id UUID,
  p_display_name TEXT,
  p_bee_name TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if bee_name is already taken
  IF p_bee_name IS NOT NULL AND NOT check_bee_name_available(p_bee_name) THEN
    RAISE EXCEPTION 'Bee name already taken';
  END IF;

  UPDATE profiles
  SET 
    display_name = p_display_name,
    bee_name = COALESCE(p_bee_name, bee_name),
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
      'display_name', display_name,
      'bee_name', bee_name,
      'phone', phone,
      'country', country
    )
    FROM profiles
    WHERE user_id = p_user_id
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_bee_name_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_display_name(UUID, TEXT, TEXT) TO authenticated; 