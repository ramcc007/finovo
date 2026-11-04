// Shared (client + server safe) blog types and helpers. Posts live in the
// `blog_posts` Supabase table; see blogDb.ts for queries.

export interface FaqItem { q: string; a: string }
export interface SourceItem { name: string; url: string }

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
  sources: SourceItem[]; // credits shown at the bottom of the article
  readingMinutes: number;
}

export const DEFAULT_DISCLAIMER =
  'This article is only for information and education. It is not investment advice or a recommendation to buy or sell any security. Please consult a SEBI-registered investment adviser before making any investment decisions.';

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}

/** Time of day in Indian Standard Time, e.g. "2:30 pm IST". */
export function formatTimeIST(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
    .replace(/[\u202f\u00a0]/g, ' ').toLowerCase() + ' IST';
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

/** The later of the publish and update times. A scheduled post was last edited before it went live, so
 *  its updated_at alone would be earlier than its publish date. */
export function modifiedAt(publishedAt: string | null, updatedAt: string): string {
  if (!publishedAt) return updatedAt;
  return Date.parse(publishedAt) > Date.parse(updatedAt) ? publishedAt : updatedAt;
}

/** Posts related to `post`: same category and shared tags score highest, ties go to the newest. */
export function relatedPosts(post: Post, all: Post[], n = 3): Post[] {
  const tags = new Set(post.tags.map(t => t.toLowerCase()));
  return all
    .filter(p => p.slug !== post.slug)
    .map(p => ({
      p,
      score: (p.category === post.category ? 2 : 0) + p.tags.filter(t => tags.has(t.toLowerCase())).length,
      at: Date.parse(p.publishedAt ?? '') || 0,
    }))
    .sort((a, b) => b.score - a.score || b.at - a.at)
    .slice(0, n)
    .map(x => x.p);
}
