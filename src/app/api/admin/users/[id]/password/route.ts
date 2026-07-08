import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isValidUserId } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabase';
import { validatePassword } from '@/lib/passwordPolicy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  if (id === admin.id) {
    return NextResponse.json({ error: "You can't change your own password from here." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const password: string = body?.password ?? '';
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const client = getServiceClient();
  const { error } = await client.auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
