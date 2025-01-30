-- Check auth user and profile connection
SELECT au.id as auth_user_id, 
       au.email as auth_email,
       p.id as profile_id,
       p.email as profile_email,
       p.phone,
       p.display_name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'simonlapscher@gmail.com'; 