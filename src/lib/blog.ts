// Shared (client + server safe) blog types and helpers. Posts live in the
// `blog_posts` Supabase table; see blogDb.ts for queries.

export interface FaqItem { q: string; a: string }

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
  category: string;
  tags: string[];
  createdAt: string; // real creation time (publishedAt may be backdated)
  author: string;
  status: 'draft' | 'published';
  publishedAt: string | null; // ISO timestamp
  updatedAt: string;
  keyTakeaways: string[]; // may contain **bold**
  faq: FaqItem[];
  readingMinutes: number;
}

export const DEFAULT_DISCLAIMER =
  'This article is only for information and education. It is not investment advice or a recommendation to buy or sell any security. Please consult a SEBI-registered investment adviser before making any investment decisions.';

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

export function readingMinutes(html: string): number {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
