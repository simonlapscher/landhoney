import { createClient } from '@supabase/supabase-js';

// @ts-ignore - These are defined by Vite
const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore - These are defined by Vite
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables:', { supabaseUrl, supabaseAnonKey });
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);