import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getServiceClient } from '@/lib/supabaseServer';
import type { Author, AuthorLinks } from '@/lib/authors';

export const AUTHORS_TAG = 'blog-authors';
export const AUTHOR_COLS = 'id, slug, name, role, bio, location, photo_url, beats, links, updated_at';

export interface AuthorRow {
  id: string; slug: string; name: string; role: string; bio: string; location: string;
  photo_url: string | null; beats: string[] | null; links: AuthorLinks | null; updated_at: string;
}

export const toAuthor = (r: AuthorRow): Author => ({
  id: r.id, slug: r.slug, name: r.name, role: r.role ?? '', bio: r.bio ?? '', location: r.location ?? '',
  photoUrl: r.photo_url, beats: r.beats ?? [], links: r.links ?? {}, updatedAt: r.updated_at,
});

const loadAll = unstable_cache(
  async (): Promise<Author[]> => {
    const { data } = await getServiceClient().from('blog_authors').select(AUTHOR_COLS).order('name');
    return ((data ?? []) as AuthorRow[]).map(toAuthor);
  },
  ['blog-authors-v1'], { tags: [AUTHORS_TAG], revalidate: 300 },
);

export const getAuthors = cache(async (): Promise<Author[]> => { try { return await loadAll(); } catch { return []; } });
export const getAuthor = cache(async (slug: string): Promise<Author | null> => (await getAuthors()).find(a => a.slug === slug) ?? null);
export const getAuthorByName = cache(async (name: string): Promise<Author | null> => (await getAuthors()).find(a => a.name === name) ?? null);
