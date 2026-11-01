import { POST_DATA } from '@/content/blog';
import type { Post } from '@/lib/blog';

// Posts committed as JSON files in src/content/blog (the Scripwise Writer app's
// flow). They are still served alongside admin-created posts; a database post
// with the same slug takes precedence, which is how an edited copy overrides
// the file version.

type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string; id: string }
  | { type: 'ol' | 'ul'; items: string[] };

interface StaticPost {
  slug: string; title: string; description: string; excerpt: string; author: string;
  category: string; tags: string[]; publishedAt: string; updatedAt: string;
  readingMinutes: number; keyTakeaways: string[]; faq: { q: string; a: string }[]; body: Block[];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (t: string) =>
  esc(t)
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

export function blocksToHtml(body: Block[]): string {
  return body.map(b =>
    b.type === 'h2' ? `<h2>${esc(b.text)}</h2>`
    : b.type === 'p' ? `<p>${inline(b.text)}</p>`
    : `<${b.type}>${b.items.map(i => `<li><p>${inline(i)}</p></li>`).join('')}</${b.type}>`
  ).join('');
}

export function getStaticPosts(): Post[] {
  return (POST_DATA as StaticPost[]).map(p => ({
    id: `static:${p.slug}`,
    slug: p.slug, title: p.title, excerpt: p.excerpt, contentHtml: blocksToHtml(p.body),
    metaTitle: null, metaDescription: p.description, category: p.category, tags: p.tags,
    featuredImage: null, author: p.author, status: 'published' as const,
    publishedAt: `${p.publishedAt}T04:00:00.000Z`, updatedAt: `${p.updatedAt}T04:00:00.000Z`,
    keyTakeaways: p.keyTakeaways, faq: p.faq, readingMinutes: p.readingMinutes,
  }));
}
