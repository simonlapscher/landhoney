Managing Simultaneous User & Admin Sessions
Core Concepts
1. Separate Browser Tab Sessions
Each browser tab maintains its own independent Supabase session
User portal and admin portal can be open simultaneously
Sessions don't interfere with each other across tabs
2. Profile Types
   // Regular User Profile
   {
     user_id: string;
     is_admin: false;
     // ... other user fields
   }

   // Admin Profile
   {
     user_id: string;
     is_admin: true;
     // ... admin fields
   }

Best Practices
1. Profile Fetching
Always use email as the primary identifier
Use RPC functions for complex profile queries
Join with auth.users table when needed
   -- Example RPC Pattern
   create function get_profile_by_email(p_email text)
   returns json as $$
     select ... from profiles p
     join auth.users u on u.id = p.user_id
     where u.email = p_email
   $$;
2. Session Management
Use useAuth() hook to get current session's user
Each tab's session is independent
Don't rely on localStorage for session state
Use email to ensure correct profile fetching
3. Portal Separation
Keep admin and user portals as separate applications
Each portal maintains its own auth state
No cross-portal session sharing needed
Let browser handle tab isolation

Common Patterns
1. Profile Fetching in Components
   const { user } = useAuth();
   
   const fetchProfile = async () => {
     if (!user?.email) return;
     const { data } = await supabase.rpc(
       'get_profile_by_email',
       { p_email: user.email }
     );
     // Handle profile data...
   };
2. Session Verification
Always verify email matches expected portal
Check is_admin flag for admin-only features
Use RLS policies to enforce access control

Key Principles
1. Email is the most reliable identifier
2. Keep sessions tab-isolated
3. Use RPC functions for complex queries
4. Trust the browser's session isolation
5. Don't try to sync between portals

This approach allows:
Admins to be logged into admin portal
Users to be logged into user portal
Both sessions to exist simultaneously
Clean separation of concerns
Reliable profile fetching


New learnings: 
Here's what we learned about user sessions and auth separation:
1. Initial Problems We Encountered:
Using originalUser led to stale session data
Using user alone caused issues when admin logged in (affected all tabs)
Mixing admin and user contexts in the same auth storage caused cross-contamination
2. What Didn't Work:
Using originalUser to maintain session across tabs
Checking email domains to detect admin status
Storing previous session data in localStorage
Using the same Supabase client for both admin and user contexts
3. The Solution That Worked:
Create two separate Supabase clients:
     // Default client for user portal
     export const supabase = createClient(supabaseUrl, supabaseAnonKey);

     // Separate client for admin portal with different storage
     export const adminSupabase = createClient(supabaseUrl, supabaseAnonKey, {
       auth: {
         storageKey: 'admin-auth',
         autoRefreshToken: true,
         persistSession: true,
       }
     });
4. Key Principles:
Keep admin and user auth completely separate
Use appropriate client for each context:
User portal → supabase
Admin portal → adminSupabase
Don't mix auth contexts between portals
Let each portal maintain its own session storage
5. Benefits:
Clean separation of concerns
No cross-contamination of sessions
Can be logged in as admin and user simultaneously
Each portal maintains its own state
No need for complex session management logic
6. Implementation Details:
Admin components use adminSupabase
User components use default supabase
Each has its own auth storage
Sessions don't interfere with each other
Permissions and views can be specific to each context

This approach gives us a much more robust and maintainable solution than trying to manage multiple user contexts within the same auth storage.
