import { getPublishedPosts } from '@/lib/blogDb';

const BASE = 'https://www.scripwise.co.in';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const posts = (await getPublishedPosts()).slice(0, 50);
  const items = posts.map(p => `    <item>
      <title>${esc(p.title)}</title>
      <link>${BASE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${BASE}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.publishedAt ?? p.updatedAt).toUTCString()}</pubDate>
      <category>${esc(p.category)}</category>
      <description>${esc(p.metaDescription || p.excerpt)}</description>
    </item>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Scripwise Blog</title>
    <link>${BASE}/blog</link>
    <description>Indian stock market insights and investing guides in plain language.</description>
    <language>en-IN</language>
    <atom:link href="${BASE}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
    },
  });
}
