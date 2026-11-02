import { NextRequest, NextResponse, after } from 'next/server';
import { requireAdmin, isValidUserId } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabase';
import { GLOSSARY_COLS, toTerm, type GlossaryRow } from '@/lib/glossaryDb';
import { parseTermInput, toTermRow } from '@/lib/glossarySanitize';
import { pingIndexNow } from '@/lib/indexNow';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data } = await getServiceClient().from('glossary_terms').select(GLOSSARY_COLS).eq('id', id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: toTerm(data as GlossaryRow) }, { headers: { 'cache-control': 'no-store' } });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const parsed = parseTermInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await getServiceClient()
    .from('glossary_terms').update(toTermRow(parsed.value)).eq('id', id).select('id, slug').maybeSingle();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That URL slug is already used by another term.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to save term.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (parsed.value.status === 'published') after(() => pingIndexNow([`/glossary/${data.slug}`, '/glossary', '/sitemap.xml']));
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { error } = await getServiceClient().from('glossary_terms').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to delete term.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
