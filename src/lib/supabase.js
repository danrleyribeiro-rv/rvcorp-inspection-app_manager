// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase environment variables are not defined:',
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL is missing' : '',
    !supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing' : ''
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // enable session persistence
    autoRefreshToken: true, // automatically refresh token when needed
    detectSessionInUrl: true, // detect token in URL for OAuth flows
  },
});