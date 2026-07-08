import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

/**
 * Verifies the request's Bearer token against Supabase and confirms the
 * caller's email matches ADMIN_EMAIL. This project has exactly one admin —
 * hardcoded via env var rather than a DB flag, checked server-side only so
 * the admin identity never ships in client-side JS.
 */
export async function requireAdmin(req: NextRequest): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return null;

  const client = getServiceClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user || !data.user.email) return null;

  if (data.user.email.toLowerCase() !== adminEmail.toLowerCase()) return null;

  return { id: data.user.id, email: data.user.email };
}
