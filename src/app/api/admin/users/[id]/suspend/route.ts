import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabase';

// Supabase bans are expressed as a duration string, not a boolean — 87600h
// (10 years) is the conventional "effectively permanent" suspension value;
// 'none' lifts it.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json({ error: "You can't suspend your own admin account." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const suspend: boolean = body?.suspend !== false;

  const client = getServiceClient();
  const { error } = await client.auth.admin.updateUserById(id, {
    ban_duration: suspend ? '87600h' : 'none',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
