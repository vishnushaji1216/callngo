import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key';

// Standard server client respecting RLS
export function createAnonServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Server-only admin client with service role for system operations (e.g. push notification dispatch)
export function createAdminServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
}
