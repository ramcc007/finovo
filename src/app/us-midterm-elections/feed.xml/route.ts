import { getElectionData } from '@/lib/election/db';
import { PAGE_DESCRIPTION, PAGE_TITLE, PAGE_URL } from '@/lib/election/content';
import { TAG_LABEL, anchorOf } from '@/lib/election/types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const { updates } = await getElectionData();
  const items = updates.slice(0, 100).map(u => `    <item>
      <title>${esc(u.headline)}</title>
      <link>${PAGE_URL}#${anchorOf(u.id)}</link>
      <guid isPermaLink="false">scripwise-election-${u.id}</guid>
      <pubDate>${new Date(u.publishedAt).toUTCString()}</pubDate>
      <category>${esc(TAG_LABEL[u.tag])}</category>
      <description>${esc(u.marketImpact ? `${u.summary} Market impact: ${u.marketImpact}` : u.summary)}</description>
${u.sources.map(s => `      <source url="${esc(s.url)}">${esc(s.name)}</source>`).slice(0, 1).join('\n')}
    </item>`).join('\n');
  const last = updates[0] ? new Date(updates[0].publishedAt).toUTCString() : new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(PAGE_TITLE)} | Scripwise</title>
    <link>${PAGE_URL}</link>
    <description>${esc(PAGE_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${last}</lastBuildDate>
    <ttl>15</ttl>
    <atom:link href="${PAGE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600' } });
}
