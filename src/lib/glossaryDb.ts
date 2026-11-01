import { getServiceClient } from '@/lib/supabase';
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

/** Published terms whose publish time has arrived, A-Z. Scheduled terms stay hidden. */
export async function getPublishedTerms(): Promise<GlossaryTerm[]> {
  try {
    const { data } = await getServiceClient()
      .from('glossary_terms').select(GLOSSARY_COLS)
      .eq('status', 'published').lte('published_at', new Date().toISOString())
      .order('term', { ascending: true });
    return ((data ?? []) as GlossaryRow[]).map(toTerm);
  } catch {
    return [];
  }
}

export async function getPublishedTerm(slug: string): Promise<GlossaryTerm | null> {
  try {
    const { data } = await getServiceClient()
      .from('glossary_terms').select(GLOSSARY_COLS).eq('slug', slug)
      .eq('status', 'published').lte('published_at', new Date().toISOString())
      .maybeSingle();
    return data ? toTerm(data as GlossaryRow) : null;
  } catch {
    return null;
  }
}
