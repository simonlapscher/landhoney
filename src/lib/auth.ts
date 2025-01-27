import { supabase } from './supabase';

export const signUp = async (email: string, password: string) => {
  try {
    // Sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) throw signUpError;
    return { data: authData, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

const WELCOME_EMAIL_KEY = 'welcome_email_sent';
const EMAIL_COOLDOWN = 30000; // 30 seconds cooldown

export const sendWelcomeEmail = async () => {
  console.log('sendWelcomeEmail called at:', new Date().toISOString());
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new Error('No user email found');
    }

    // Check if email was already sent recently
    const lastSentTime = localStorage.getItem(WELCOME_EMAIL_KEY);
    if (lastSentTime) {
      const timeSinceLastEmail = Date.now() - parseInt(lastSentTime);
      if (timeSinceLastEmail < EMAIL_COOLDOWN) {
        console.log('Email already sent recently, skipping');
        return { success: true };
      }
    }

    // Set the sent time before sending to prevent race conditions
    localStorage.setItem(WELCOME_EMAIL_KEY, Date.now().toString());

    console.log('Invoking welcome-email function for:', user.email);
    const { error } = await supabase.functions.invoke('welcome-email', {
      body: { email: user.email }
    });

    if (error) {
      // If there's an error, remove the sent time to allow retry
      localStorage.removeItem(WELCOME_EMAIL_KEY);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error in sendWelcomeEmail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send welcome email' 
    };
  }
}; 