import sanitizeHtml from 'sanitize-html';
import { slugify, readingMinutes, type FaqItem } from '@/lib/blog';

// Server-only. Admin-authored HTML is still sanitised before storage so a
// compromised session can't plant scripts that run for every reader.

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li',
      'blockquote', 'hr', 'code', 'pre',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tag, attribs) => {
        const href = attribs.href ?? '';
        const external = /^https?:\/\//i.test(href);
        return {
          tagName: 'a',
          attribs: { ...attribs, ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}) },
        };
      },
    },
  });
}

export interface PostInput {
  title: string; slug: string; excerpt: string; contentHtml: string;
  metaTitle: string | null; metaDescription: string | null; category: string; author: string;
  tags: string[]; status: 'draft' | 'published';
  publishedAt: string | null; keyTakeaways: string[]; faq: FaqItem[]; readingMinutes: number;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function parsePostInput(body: unknown): { ok: true; value: PostInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request body.' };
  const b = body as Record<string, unknown>;

  const title = str(b.title, 200);
  if (!title) return { ok: false, error: 'Title is required.' };

  const slug = slugify(str(b.slug, 120) || title);
  if (!slug) return { ok: false, error: 'A valid URL slug is required.' };

  const status = b.status === 'published' ? 'published' : 'draft';
  const contentHtml = sanitizeContent(typeof b.contentHtml === 'string' ? b.contentHtml.slice(0, 500_000) : '');
  if (status === 'published' && !contentHtml.replace(/<[^>]*>/g, '').trim()) {
    return { ok: false, error: 'Add some content before publishing.' };
  }

  let publishedAt: string | null = null;
  if (status === 'published') {
    const d = typeof b.publishedAt === 'string' && b.publishedAt ? new Date(b.publishedAt) : new Date();
    if (Number.isNaN(d.getTime())) return { ok: false, error: 'Invalid publish date.' };
    publishedAt = d.toISOString();
  }

  const tags = Array.isArray(b.tags)
    ? [...new Set(b.tags.map(t => str(t, 40)).filter(Boolean))].slice(0, 15)
    : [];
  const keyTakeaways = Array.isArray(b.keyTakeaways)
    ? b.keyTakeaways.map(t => str(t, 400)).filter(Boolean).slice(0, 10)
    : [];
  const faq = Array.isArray(b.faq)
    ? b.faq
        .map(f => (f && typeof f === 'object' ? { q: str((f as FaqItem).q, 300), a: str((f as FaqItem).a, 1500) } : { q: '', a: '' }))
        .filter(f => f.q && f.a)
        .slice(0, 15)
    : [];

  return {
    ok: true,
    value: {
      title, slug, excerpt: str(b.excerpt, 400), contentHtml,
      metaTitle: str(b.metaTitle, 120) || null,
      metaDescription: str(b.metaDescription, 320) || null,
      category: str(b.category, 60) || 'Uncategorized',
      author: str(b.author, 80) || 'Admin',
      tags, status, publishedAt, keyTakeaways, faq,
      readingMinutes: readingMinutes(contentHtml),
    },
  };
}

export function toRow(v: PostInput) {
  return {
    slug: v.slug, title: v.title, excerpt: v.excerpt, content_html: v.contentHtml,
    meta_title: v.metaTitle, meta_description: v.metaDescription, category: v.category, author: v.author,
    tags: v.tags, featured_image: null, status: v.status, published_at: v.publishedAt,
    key_takeaways: v.keyTakeaways, faq: v.faq, reading_minutes: v.readingMinutes,
    updated_at: new Date().toISOString(),
  };
}
