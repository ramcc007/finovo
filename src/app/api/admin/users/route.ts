import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabase';

interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  investor_profile: string | null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const client = getServiceClient();

  // auth.admin.listUsers() is paginated (200/page cap here) — walk pages
  // until exhausted, capped well above any realistic near-term user count.
  const users: Array<Record<string, unknown>> = [];
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    users.push(...(data.users as unknown as Record<string, unknown>[]));
    if (data.users.length < 200) break;
  }

  const { data: profiles } = await client
    .from('profiles')
    .select('id, first_name, last_name, city, investor_profile');
  const profileMap = new Map((profiles ?? []).map(p => [p.id as string, p]));

  const rows: AdminUserRow[] = users.map(u => {
    const p = profileMap.get(u.id as string);
    return {
      id: u.id as string,
      email: (u.email as string) ?? null,
      created_at: u.created_at as string,
      last_sign_in_at: (u.last_sign_in_at as string) ?? null,
      email_confirmed_at: (u.email_confirmed_at as string) ?? null,
      banned_until: (u.banned_until as string) ?? null,
      first_name: (p?.first_name as string) ?? null,
      last_name: (p?.last_name as string) ?? null,
      city: (p?.city as string) ?? null,
      investor_profile: (p?.investor_profile as string) ?? null,
    };
  });

  rows.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

  return NextResponse.json({ data: rows });
}
