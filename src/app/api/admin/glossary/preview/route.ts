import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { GLOSSARY_COLS, getPublishedTerms, toTerm, type GlossaryRow } from '@/lib/glossaryDb';
import { liveInternalPaths, unlinkNotLive } from '@/lib/liveLinks';
import { enhanceContent } from '@/lib/enhance';

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
  // The same pipeline as the live page (see glossary/[slug]/page.tsx).
  const [live, terms] = await Promise.all([liveInternalPaths(), getPublishedTerms()]);
  const aids = enhanceContent(unlinkNotLive(term.contentHtml, live), {
    glossary: terms.map(x => ({ slug: x.slug, term: x.term, definition: x.definition })),
    selfSlug: term.slug,
    maxTerms: 3,
  });
  return NextResponse.json({ data: { term, related: rel ?? [], aids } }, { headers: { 'cache-control': 'no-store' } });
}
