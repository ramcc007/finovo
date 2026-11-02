import { slugify, readingMinutes, type FaqItem } from '@/lib/blog';
import { sanitizeContent } from '@/lib/blogSanitize';

// Server-only validation for glossary terms saved from the admin editor.

export interface TermInput {
  term: string; slug: string; title: string; definition: string; contentHtml: string;
  metaDescription: string | null; category: string; tags: string[]; related: string[];
  faq: FaqItem[]; status: 'draft' | 'published'; publishedAt: string | null; readingMinutes: number;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseTermInput(body: unknown): { ok: true; value: TermInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request body.' };
  const b = body as Record<string, unknown>;

  const term = str(b.term, 120);
  if (!term) return { ok: false, error: 'Term is required.' };
  const slug = slugify(str(b.slug, 120) || term);
  if (!slug) return { ok: false, error: 'A valid URL slug is required.' };
  const title = str(b.title, 200) || term;

  const status = b.status === 'published' ? 'published' : 'draft';
  const definition = str(b.definition, 600);
  const contentHtml = sanitizeContent(typeof b.contentHtml === 'string' ? b.contentHtml.slice(0, 300_000) : '');
  if (status === 'published') {
    if (!definition) return { ok: false, error: 'Add a short definition before publishing.' };
    if (!contentHtml.replace(/<[^>]*>/g, '').trim()) return { ok: false, error: 'Add some content before publishing.' };
  }

  let publishedAt: string | null = null;
  if (status === 'published') {
    const d = typeof b.publishedAt === 'string' && b.publishedAt ? new Date(b.publishedAt) : new Date();
    if (Number.isNaN(d.getTime())) return { ok: false, error: 'Invalid publish date.' };
    publishedAt = d.toISOString();
  }

  const tags = Array.isArray(b.tags) ? [...new Set(b.tags.map(t => str(t, 40)).filter(Boolean))].slice(0, 15) : [];
  const related = Array.isArray(b.related)
    ? [...new Set(b.related.map(r => str(r, 120)).filter(r => SLUG_RE.test(r) && r !== slug))].slice(0, 12)
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
      term, slug, title, definition, contentHtml,
      metaDescription: str(b.metaDescription, 320) || null,
      category: str(b.category, 60) || 'Investing Basics',
      tags, related, faq, status, publishedAt,
      readingMinutes: readingMinutes(contentHtml),
    },
  };
}

export function toTermRow(v: TermInput) {
  return {
    term: v.term, slug: v.slug, title: v.title, definition: v.definition, content_html: v.contentHtml,
    meta_description: v.metaDescription, category: v.category, tags: v.tags, related: v.related,
    faq: v.faq, status: v.status, published_at: v.publishedAt, reading_minutes: v.readingMinutes,
    updated_at: new Date().toISOString(),
  };
}
