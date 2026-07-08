import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isValidUserId } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabase';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  if (id === admin.id) {
    return NextResponse.json({ error: "You can't delete your own admin account." }, { status: 400 });
  }

  const client = getServiceClient();
  const { error } = await client.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
