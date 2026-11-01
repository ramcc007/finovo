import { getServiceClient } from '@/lib/supabase';
import type { Post } from '@/lib/blog';
import { getStaticPosts } from '@/lib/staticBlog';

// Server-only: uses the service-role client (the table has RLS on and no
// public policies). Never import from a client component.

interface Row {
  id: string; slug: string; title: string; excerpt: string; content_html: string;
  meta_title: string | null; meta_description: string | null; category: string;
  tags: string[]; featured_image: string | null; author: string;
  status: 'draft' | 'published'; published_at: string | null; updated_at: string;
  key_takeaways: unknown; faq: unknown; reading_minutes: number;
}

const COLS = 'id, slug, title, excerpt, content_html, meta_title, meta_description, category, tags, featured_image, author, status, published_at, updated_at, key_takeaways, faq, reading_minutes';

function toPost(r: Row): Post {
  return {
    id: r.id, slug: r.slug, title: r.title, excerpt: r.excerpt, contentHtml: r.content_html,
    metaTitle: r.meta_title, metaDescription: r.meta_description, category: r.category,
    tags: r.tags ?? [], featuredImage: r.featured_image, author: r.author, status: r.status,
    publishedAt: r.published_at, updatedAt: r.updated_at,
    keyTakeaways: Array.isArray(r.key_takeaways) ? (r.key_takeaways as string[]) : [],
    faq: Array.isArray(r.faq) ? (r.faq as Post['faq']) : [],
    readingMinutes: r.reading_minutes,
  };
}

/** Published posts whose publish date has arrived (scheduled posts stay hidden). */
export async function getPublishedPosts(): Promise<Post[]> {
  try {
    const { data } = await getServiceClient()
      .from('blog_posts').select(COLS)
      .eq('status', 'published').lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });
    const db = ((data ?? []) as Row[]).map(toPost);
    return mergeStatic(db, await getHiddenSlugs());
  } catch {
    return mergeStatic([], new Set());
  }
}

/** Slugs of file-based posts the admin has deleted. */
export async function getHiddenSlugs(): Promise<Set<string>> {
  try {
    const { data } = await getServiceClient().from('blog_hidden_slugs').select('slug');
    return new Set((data ?? []).map((r: { slug: string }) => r.slug));
  } catch {
    return new Set();
  }
}

/** File-based posts fill in any slug the database doesn't override. */
function mergeStatic(db: Post[], hidden: Set<string>): Post[] {
  const slugs = new Set(db.map(p => p.slug));
  return [...db, ...getStaticPosts().filter(p => !slugs.has(p.slug) && !hidden.has(p.slug))]
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}

export async function getPublishedPost(slug: string): Promise<Post | null> {
  try {
    const { data } = await getServiceClient()
      .from('blog_posts').select(COLS).eq('slug', slug)
      .eq('status', 'published').lte('published_at', new Date().toISOString())
      .maybeSingle();
    if (data) return toPost(data as Row);
  } catch {
    // fall through to file-based posts
  }
  const hidden = await getHiddenSlugs();
  return getStaticPosts().find(p => p.slug === slug && !hidden.has(slug)) ?? null;
}

export { toPost, COLS };
export type { Row };
