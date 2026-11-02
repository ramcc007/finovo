import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getServiceClient } from '@/lib/supabase';
import type { Post } from '@/lib/blog';
import { getStaticPosts } from '@/lib/staticBlog';
import { sanitizeContent } from '@/lib/blogSanitize';

// Server-only: uses the service-role client (the table has RLS on and no
// public policies). Never import from a client component.

interface Row {
  id: string; slug: string; title: string; excerpt: string; content_html: string;
  meta_title: string | null; meta_description: string | null; category: string;
  tags: string[]; created_at: string; author: string;
  status: 'draft' | 'published'; published_at: string | null; updated_at: string;
  key_takeaways: unknown; faq: unknown; sources: unknown; reading_minutes: number;
}

const COLS = 'id, slug, title, excerpt, content_html, meta_title, meta_description, category, tags, author, status, published_at, created_at, updated_at, key_takeaways, faq, sources, reading_minutes';

function toPost(r: Row): Post {
  return {
    id: r.id, slug: r.slug, title: r.title, excerpt: r.excerpt, contentHtml: r.content_html,
    metaTitle: r.meta_title, metaDescription: r.meta_description, category: r.category,
    tags: r.tags ?? [], createdAt: r.created_at, author: r.author, status: r.status,
    publishedAt: r.published_at, updatedAt: r.updated_at,
    keyTakeaways: Array.isArray(r.key_takeaways) ? (r.key_takeaways as string[]) : [],
    faq: Array.isArray(r.faq) ? (r.faq as Post['faq']) : [],
    sources: Array.isArray(r.sources) ? (r.sources as Post['sources']) : [],
    readingMinutes: r.reading_minutes,
  };
}

/** Cache tag for published blog data; admin saves invalidate it. */
export const BLOG_TAG = 'blog-posts';

// Every published post (scheduled ones included), cached across requests for
// up to 5 minutes so article and listing pages don't hit the database on each
// view. The "has its publish time arrived" filter runs per request below, so
// scheduled posts still go live on time. Admin saves call revalidateTag.
const loadPublished = unstable_cache(
  async (): Promise<Post[]> => {
    const { data, error } = await getServiceClient()
      .from('blog_posts').select(COLS)
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as Row[]).map(toPost);
  },
  ['blog-published-v1'],
  { revalidate: 300, tags: [BLOG_TAG] },
);

const loadHidden = unstable_cache(
  async (): Promise<string[]> => {
    const { data, error } = await getServiceClient().from('blog_hidden_slugs').select('slug');
    if (error) throw error;
    return (data ?? []).map((r: { slug: string }) => r.slug);
  },
  ['blog-hidden-v1'],
  { revalidate: 300, tags: [BLOG_TAG] },
);

/** Slugs of file-based posts the admin has deleted. */
export const getHiddenSlugs = cache(async (): Promise<Set<string>> => {
  try {
    return new Set(await loadHidden());
  } catch {
    return new Set();
  }
});

/** Published posts whose publish date has arrived (scheduled posts stay hidden).
 *  Deduplicated per request with React cache(). */
export const getPublishedPosts = cache(async (): Promise<Post[]> => {
  const now = Date.now();
  let db: Post[] = [];
  try {
    db = (await loadPublished()).filter(p => p.publishedAt && Date.parse(p.publishedAt) <= now);
  } catch {
    // DB unreachable: fall back to file-based posts only.
  }
  return mergeStatic(db, await getHiddenSlugs());
});

/** File-based posts fill in any slug the database doesn't override. */
function mergeStatic(db: Post[], hidden: Set<string>): Post[] {
  const slugs = new Set(db.map(p => p.slug));
  return [...db, ...getStaticPosts().filter(p => !slugs.has(p.slug) && !hidden.has(p.slug))]
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}

export const getPublishedPost = cache(async (slug: string): Promise<Post | null> => {
  const post = (await getPublishedPosts()).find(p => p.slug === slug);
  if (!post) return null;
  // Posts are text-only: strips any <img> left in older content.
  return post.id.startsWith('static:') ? post : { ...post, contentHtml: sanitizeContent(post.contentHtml) };
});

export { toPost, COLS };
export type { Row };
