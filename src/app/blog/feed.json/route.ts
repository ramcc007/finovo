import { getPublishedPosts } from '@/lib/blogDb';

const BASE = 'https://www.scripwise.co.in';

// JSON Feed 1.1 of the latest blog posts, for readers and aggregators that prefer JSON over RSS.
export async function GET() {
  const posts = (await getPublishedPosts()).slice(0, 50);
  const body = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Scripwise Blog',
    home_page_url: `${BASE}/blog`,
    feed_url: `${BASE}/blog/feed.json`,
    description: 'Indian stock market insights and investing guides in plain language.',
    language: 'en-IN',
    hubs: [{ type: 'WebSub', url: 'https://pubsubhubbub.appspot.com/' }],
    items: posts.map(p => ({
      id: p.id,
      url: `${BASE}/blog/${p.slug}`,
      title: p.title,
      summary: p.metaDescription || p.excerpt,
      date_published: p.publishedAt ?? p.updatedAt,
      date_modified: p.updatedAt,
      tags: [p.category, ...p.tags],
      authors: [{ name: p.author }],
    })),
  };
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8', 'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600' },
  });
}
