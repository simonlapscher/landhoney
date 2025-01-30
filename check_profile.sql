-- Check all columns in the profiles table
SELECT * FROM profiles;

-- Check profile data by joining with auth.users
SELECT 
  p.user_id,
  p.phone,
  p.display_name,
  p.country,
  au.email
FROM profiles p
JOIN auth.users au ON au.id = p.user_id
WHERE au.email = 'simonlapscher@gmail.com'; 
