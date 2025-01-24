import { createClient } from '@supabase/supabase-js';

// @ts-ignore - These are defined by Vite
const supabaseUrl: string = __SUPABASE_URL__;
// @ts-ignore - These are defined by Vite
const supabaseAnonKey: string = __SUPABASE_ANON_KEY__;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables:', { supabaseUrl, supabaseAnonKey });
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);