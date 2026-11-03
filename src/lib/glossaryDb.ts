import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getServiceClient } from '@/lib/supabaseServer';
import { sanitizeContent } from '@/lib/blogSanitize';
import type { GlossaryTerm } from '@/lib/glossary';

// Server-only: uses the service-role client (the table has RLS on and no public policies).
// Never import from a client component.

export interface GlossaryRow {
  id: string; slug: string; term: string; title: string; definition: string; content_html: string;
  meta_description: string | null; category: string; tags: string[] | null; related: string[] | null;
  faq: unknown; author: string; status: 'draft' | 'published'; published_at: string | null;
  updated_at: string; created_at: string; reading_minutes: number;
}

export const GLOSSARY_COLS =
  'id, slug, term, title, definition, content_html, meta_description, category, tags, related, faq, author, status, published_at, updated_at, created_at, reading_minutes';

export function toTerm(r: GlossaryRow): GlossaryTerm {
  return {
    id: r.id, slug: r.slug, term: r.term, title: r.title, definition: r.definition,
    contentHtml: sanitizeContent(r.content_html), metaDescription: r.meta_description, category: r.category,
    tags: r.tags ?? [], related: r.related ?? [],
    faq: Array.isArray(r.faq) ? (r.faq as GlossaryTerm['faq']) : [],
    author: r.author, status: r.status, publishedAt: r.published_at, updatedAt: r.updated_at,
    createdAt: r.created_at, readingMinutes: r.reading_minutes,
  };
}

/** Cache tag for published glossary data; admin saves invalidate it. */
export const GLOSSARY_TAG = 'glossary-terms';

// Every published term (scheduled ones included), already mapped and
// sanitised, cached across requests for up to 5 minutes. The publish-time
// filter runs per request, so scheduled terms still go live on time.
const loadPublished = unstable_cache(
  async (): Promise<GlossaryTerm[]> => {
    const { data, error } = await getServiceClient()
      .from('glossary_terms').select(GLOSSARY_COLS)
      .eq('status', 'published')
      .order('term', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as GlossaryRow[]).map(toTerm);
  },
  ['glossary-published-v1'],
  { revalidate: 300, tags: [GLOSSARY_TAG] },
);

/** Published terms whose publish time has arrived, A-Z. Scheduled terms stay hidden.
 *  Deduplicated per request with React cache(). */
export const getPublishedTerms = cache(async (): Promise<GlossaryTerm[]> => {
  const now = Date.now();
  try {
    return (await loadPublished()).filter(t => t.publishedAt && Date.parse(t.publishedAt) <= now);
  } catch {
    return [];
  }
});

export const getPublishedTerm = cache(async (slug: string): Promise<GlossaryTerm | null> =>
  (await getPublishedTerms()).find(t => t.slug === slug) ?? null,
);
