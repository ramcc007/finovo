import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { fetchFeed, jaccard, titleTokens } from '@/lib/election/rss';

// Recent headlines about a company from Google News. Headlines and links only: each item credits and
// links to its publisher. Cached for 15 minutes per symbol.
const loadNews = unstable_cache(
  async (sym: string) => {
    const { data } = await supabase.from('companies').select('name').eq('symbol', sym).maybeSingle();
    const short = (data?.name ?? sym).replace(/\b(limited|ltd\.?|corporation|corp\.?)\b/gi, '').replace(/\s+/g, ' ').trim();
    const q = `"${short}" when:14d`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const r = await fetchFeed({ name: 'Google News', url, targeted: true });
    const items = [...r.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    const out: { title: string; url: string; source: string; publishedAt: string }[] = [];
    const seen: string[][] = [];
    for (const it of items) {
      const tok = titleTokens(it.title);
      if (seen.some(s => jaccard(s, tok) >= 0.6)) continue; // same story from another outlet
      seen.push(tok);
      out.push({ title: it.title, url: it.url, source: it.source, publishedAt: it.publishedAt });
      if (out.length >= 8) break;
    }
    return out;
  },
  ['stock-news-v1'],
  { revalidate: 900 },
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const sym = (await params).symbol.toUpperCase();
  if (!/^[A-Z0-9&-]{1,20}$/.test(sym)) return NextResponse.json({ items: [] });
  try {
    return NextResponse.json({ items: await loadNews(sym) }, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
