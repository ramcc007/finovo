import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse, after } from 'next/server';
import { GLOSSARY_TAG } from '@/lib/glossaryDb';
import { requireAdmin } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { parseTermInput, toTermRow } from '@/lib/glossarySanitize';
import { pingIndexNow } from '@/lib/indexNow';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await getServiceClient()
    .from('glossary_terms')
    .select('id, slug, term, title, category, status, published_at, updated_at, created_at')
    .order('term', { ascending: true });
  if (error) return NextResponse.json({ error: 'Failed to load terms.' }, { status: 500 });
  return NextResponse.json({ data }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = parseTermInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await getServiceClient()
    .from('glossary_terms').insert(toTermRow(parsed.value)).select('id, slug').single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That URL slug is already used by another term.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to create term.' }, { status: 500 });
  }
  if (parsed.value.status === 'published') after(() => pingIndexNow([`/glossary/${data.slug}`, '/glossary', '/sitemap.xml']));
  revalidateTag(GLOSSARY_TAG, { expire: 0 }); revalidatePath('/glossary', 'layout');
  return NextResponse.json({ data }, { status: 201 });
}
