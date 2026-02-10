
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Supabase Connection Audit:', {
  hasUrl: !!supabaseUrl,
  urlPrefix: supabaseUrl.slice(0, 8),
  hasKey: !!supabaseAnonKey
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
