import { supabase } from '@/lib/supabase';

/** fetch() wrapper that attaches the current session's access token as a
 * Bearer header — used for entitlement/billing calls, which verify it
 * server-side. Same pattern as adminFetch, kept separate since these are
 * conceptually different callers (any signed-in user, not just the admin). */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
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
