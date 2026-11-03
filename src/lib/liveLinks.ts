import { getPublishedPosts } from '@/lib/blogDb';
import { getPublishedTerms } from '@/lib/glossaryDb';

// Server-only. Internal links to blog posts or glossary terms that are not live yet (scheduled for later)
// or do not exist would send readers to a 404. Such links are shown as plain text until the target is live.
export async function liveInternalPaths(): Promise<Set<string>> {
  const [posts, terms] = await Promise.all([getPublishedPosts(), getPublishedTerms()]);
  return new Set([...posts.map(p => `/blog/${p.slug}`), ...terms.map(t => `/glossary/${t.slug}`)]);
}

// Relative links and absolute links to our own site (https://www.scripwise.co.in/blog/...) are both checked.
export function unlinkNotLive(html: string, live: Set<string>): string {
  return html.replace(
    /<a\b[^>]*\bhref="(?:https?:\/\/(?:www\.)?scripwise\.co\.in)?(\/(?:blog|glossary)\/[^"#?]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
    (whole, path: string, inner: string) => (live.has(path.replace(/\/$/, '')) ? whole : inner),
  );
}

/** "<title> | Scripwise" runs past the ~60 characters Google shows for long titles; those use the title alone. */
export function pageTitle(title: string): string | { absolute: string } {
  return title.length + ' | Scripwise'.length > 60 ? { absolute: title } : title;
}
