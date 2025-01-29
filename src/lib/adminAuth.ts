import { supabase } from './supabase';

export const checkAdminStatus = async () => {
  console.log('Starting admin status check...');
  
  try {
    console.log('Fetching user data...');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
    
    if (!user) {
      console.log('No user found');
      return false;
    }
    
    console.log('User data:', {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
      role: user.role
    });
    
    const isAdmin = user.user_metadata?.is_admin === true;
    console.log('Is admin?', isAdmin);
    
    return isAdmin;
  } catch (err) {
    console.error('Error in checkAdminStatus:', err);
    throw err;
  }
}; 