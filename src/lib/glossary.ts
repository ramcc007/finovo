// Shared (client + server safe) glossary types. Terms live in the `glossary_terms` Supabase table; see glossaryDb.ts.
import type { FaqItem } from '@/lib/blog';

export interface GlossaryTerm {
  id: string;
  slug: string;
  term: string;
  title: string;
  definition: string; // one or two sentences
  contentHtml: string;
  metaDescription: string | null;
  category: string;
  tags: string[];
  related: string[]; // slugs of related terms
  faq: FaqItem[];
  author: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  readingMinutes: number;
}

/** The A-Z letter a term is filed under ("#" for terms starting with a digit). */
export function letterOf(term: string): string {
  const c = term.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}
