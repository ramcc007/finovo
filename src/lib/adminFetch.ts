import { supabase } from '@/lib/supabase';

/** fetch() wrapper that attaches the current session's access token as a
 * Bearer header — used for all /api/admin/* calls, which verify it server-side. */
export async function adminFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
