import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { isValidUserId } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabase';
import { parsePostInput, toRow } from '@/lib/blogSanitize';
import { COLS, toPost, type Row } from '@/lib/blogDb';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data } = await getServiceClient().from('blog_posts').select(COLS).eq('id', id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: toPost(data as Row) });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const parsed = parsePostInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await getServiceClient()
    .from('blog_posts').update(toRow(parsed.value)).eq('id', id).select('id, slug').maybeSingle();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That URL slug is already used by another post.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to save post.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { error } = await getServiceClient().from('blog_posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to delete post.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
