import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

/**
 * Verifies the request's Bearer token against Supabase and confirms the
 * caller is the admin. Prefers the immutable ADMIN_USER_ID (Supabase auth
 * user UUID) when configured — email is a user-changeable field and
 * shouldn't be the sole gate for admin access; falls back to ADMIN_EMAIL
 * for deployments that haven't set ADMIN_USER_ID yet. Checked server-side
 * only so the admin identity never ships in client-side JS.
 */
export async function requireAdmin(req: NextRequest): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const adminUserId = process.env.ADMIN_USER_ID;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminUserId && !adminEmail) return null;

  const client = getServiceClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  if (adminUserId) {
    if (data.user.id !== adminUserId) return null;
  } else if (adminEmail) {
    if (!data.user.email || data.user.email.toLowerCase() !== adminEmail.toLowerCase()) return null;
  } else {
    return null;
  }

  return { id: data.user.id, email: data.user.email ?? '' };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Supabase auth user IDs are always UUIDs — reject anything else before it
 * reaches the admin API, rather than letting a malformed value produce a
 * raw Supabase error string back to the client. */
export function isValidUserId(id: string): boolean {
  return UUID_RE.test(id);
}
