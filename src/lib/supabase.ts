import { createClient } from '@supabase/supabase-js';

// @ts-ignore - These are defined by Vite
const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore - These are defined by Vite
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables:', { supabaseUrl, supabaseAnonKey });
  throw new Error('Missing Supabase environment variables');
}

// Create client for user portal with default storage key
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create client for admin portal with different storage key
export const adminSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'admin-auth',
    autoRefreshToken: true,
    persistSession: true,
  }
});