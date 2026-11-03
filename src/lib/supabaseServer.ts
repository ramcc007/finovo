import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service-role client. Bypasses RLS, so it must never reach a browser bundle:
// the server-only import makes any client-component import fail the build.
export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase service env vars not configured');
  return createClient(url, key);
}
