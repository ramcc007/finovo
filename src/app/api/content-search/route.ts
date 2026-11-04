import { NextRequest, NextResponse } from 'next/server';
import { getPublishedTerms } from '@/lib/glossaryDb';
import { getPublishedPosts } from '@/lib/blogDb';
import { searchDocs, type SearchDoc } from '@/lib/contentSearch';

// Suggestions for the glossary and blog search boxes. Reads the same cached lists the pages use.
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const cache = { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } };
  if (q.trim().length < 2 || (type !== 'glossary' && type !== 'blog')) return NextResponse.json([], cache);
  const docs: SearchDoc[] = type === 'glossary'
    ? (await getPublishedTerms()).map(t => ({ href: `/glossary/${t.slug}`, title: t.term, sub: t.definition, tag: t.category, extra: t.tags.join(' ') }))
    : (await getPublishedPosts()).map(p => ({ href: `/blog/${p.slug}`, title: p.title, sub: p.excerpt, tag: p.category, extra: p.tags.join(' ') }));
  return NextResponse.json(searchDocs(docs, q, 6), cache);
}
