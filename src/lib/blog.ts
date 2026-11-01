// Blog content. Each post is a JSON file in src/content/blog/, listed in src/content/blog/index.ts.
// Inline markup supported in strings: **bold** and [text](/path).
import { POST_DATA } from '@/content/blog';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string; id: string }
  | { type: 'ol'; items: string[] }
  | { type: 'ul'; items: string[] };

export interface Post {
  slug: string;
  title: string;
  description: string; // meta description (~155 chars)
  excerpt: string;
  author: string; // one of AUTHORS, picked at random when the post is added
  category: string;
  tags: string[];
  publishedAt: string; // ISO date
  updatedAt: string;
  readingMinutes: number;
  keyTakeaways: string[];
  faq: { q: string; a: string }[];
  body: Block[];
  disclaimer: string;
}

// Bylines for blog posts. Each new post gets one of these at random (fixed per post, not per page view).
export const AUTHORS = [
  'Prateek Desai',
  'Ram Das',
  'Preeta Kulkarni',
  'Rahul Dev',
  'Veena Sharma',
  'Ankit Gupta',
  'Vaibhav Poddar',
  'Avinash Solanki',
] as const;

const BLOCK_TYPES = new Set(['p', 'h2', 'ol', 'ul']);

// Light shape check so one malformed file fails loudly at build time instead of rendering a broken page.
function toPost(raw: unknown): Post {
  const p = raw as Post;
  const ok =
    p && typeof p.slug === 'string' && typeof p.title === 'string' && typeof p.author === 'string' &&
    typeof p.publishedAt === 'string' && Array.isArray(p.body) && Array.isArray(p.faq) &&
    Array.isArray(p.keyTakeaways) && Array.isArray(p.tags) &&
    p.body.every(b => b && BLOCK_TYPES.has((b as Block).type));
  if (!ok) throw new Error(`Invalid blog post data: ${(p && p.slug) || 'unknown slug'}`);
  return p;
}

export const POSTS: Post[] = POST_DATA.map(toPost);

export function getPost(slug: string): Post | undefined {
  return POSTS.find(p => p.slug === slug);
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
