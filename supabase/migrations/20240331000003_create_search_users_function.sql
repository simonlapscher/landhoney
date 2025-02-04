-- Revoke execute from public
REVOKE EXECUTE ON FUNCTION search_users_by_email(TEXT) FROM PUBLIC;

-- Drop the existing function first
DROP FUNCTION IF EXISTS search_users_by_email(TEXT);

-- Create a function to search users by email pattern
CREATE OR REPLACE FUNCTION search_users_by_email(search_term TEXT)
RETURNS TABLE (
    id UUID,
    email VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if the current user is an admin using the existing check_admin_status function
    SELECT check_admin_status() INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    RETURN QUERY
    SELECT 
        au.id,
        au.email::VARCHAR
    FROM auth.users au
    WHERE au.email ILIKE '%' || search_term || '%'
    ORDER BY au.email
    LIMIT 10;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_users_by_email(TEXT) TO authenticated; 