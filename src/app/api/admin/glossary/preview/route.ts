import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { GLOSSARY_COLS, toTerm, type GlossaryRow } from '@/lib/glossaryDb';

/** Admin-only: a glossary term by slug whatever its status or date, with its related terms that exist. */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const slug = (req.nextUrl.searchParams.get('slug') ?? '').trim();
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const client = getServiceClient();
  const { data } = await client.from('glossary_terms').select(GLOSSARY_COLS).eq('slug', slug).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const term = toTerm(data as GlossaryRow);
  const { data: rel } = term.related.length
    ? await client.from('glossary_terms').select('slug, term').in('slug', term.related)
    : { data: [] as { slug: string; term: string }[] };
  return NextResponse.json({ data: { term, related: rel ?? [] } }, { headers: { 'cache-control': 'no-store' } });
}
