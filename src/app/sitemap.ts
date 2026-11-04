import { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/lib/blogDb';
import { slugify } from '@/lib/blog';
import { getPublishedTerms } from '@/lib/glossaryDb';
import { getElectionData } from '@/lib/election/db';
import { getAuthors } from '@/lib/authorsDb';
import { MIN_UPDATES_TO_INDEX, SECTION_IDS, SECTIONS, listRaces, racePath, sectionUpdates } from '@/lib/election/sections';

const base = 'https://www.scripwise.co.in';

// Regenerated every 10 minutes (not frozen at deploy time), so posts and
// glossary terms published from the admin, or reaching their scheduled time,
// appear without a redeploy.
export const revalidate = 300;

// Ram's rule (3 Nov 2026): no <lastmod> anywhere, except the live US election pages (4 Nov 2026),
// which carry the real time of their latest update; every URL carries
// <changefreq> and <priority> instead. Paginated blog listings (/blog/page/N) and stock pages are
// deliberately not listed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await getPublishedPosts(); // newest publish date first

  const blogRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/blog`, changeFrequency: 'daily', priority: 0.8 },
    ...[...new Set(blogPosts.map(p => slugify(p.category)))].map(cat => ({
      url: `${base}/blog/category/${cat}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...blogPosts.map(p => ({ url: `${base}/blog/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
  ];

  // Author pages, for authors with at least one live post.
  const liveAuthors = new Set(blogPosts.map(p => p.author));
  const authorRoutes: MetadataRoute.Sitemap = (await getAuthors()).filter(a => liveAuthors.has(a.name))
    .map(a => ({ url: `${base}/blog/author/${a.slug}`, changeFrequency: 'weekly' as const, priority: 0.5 }));

  const glossaryTerms = await getPublishedTerms();
  const glossaryRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/glossary`, changeFrequency: 'weekly', priority: 0.7 },
    ...glossaryTerms.map(t => ({ url: `${base}/glossary/${t.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/screener`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/markets`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/pricing`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/screens`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/pulse`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/compare`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/signup`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/disclaimer`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/refund`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Stock pages (/stocks/[symbol]) are deliberately left out: thousands of
  // thin, data-only pages dilute the sitemap. They stay reachable by links.
  // Election section and race pages: only those with something to say.
  const { updates: electionUpdates, meta: electionMeta } = await getElectionData();
  const newest = (...t: (string | null | undefined)[]) => { const v = t.filter((x): x is string => !!x).sort().pop(); return v ? new Date(v) : undefined; };
  const boardTimes = Object.values(electionMeta?.scoreboard ?? {}).map(e => e?.updatedAt);
  const electionRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/us-midterm-elections`, lastModified: newest(electionUpdates[0]?.publishedAt, ...boardTimes), changeFrequency: 'hourly', priority: 0.8 },
    ...SECTION_IDS.filter(id => sectionUpdates(SECTIONS[id], electionUpdates).length > 0)
      .map(id => ({ url: `${base}${SECTIONS[id].path}`, lastModified: newest(sectionUpdates(SECTIONS[id], electionUpdates)[0]?.publishedAt, ...(id === 'markets' ? [] : boardTimes)), changeFrequency: 'hourly' as const, priority: 0.8 })),
    ...listRaces(electionUpdates).filter(r => r.count >= MIN_UPDATES_TO_INDEX)
        .map(r => ({ url: `${base}${racePath(r.slug)}`, lastModified: newest(r.latest), changeFrequency: 'hourly' as const, priority: 0.7 })),
  ];

  return [...staticRoutes, ...electionRoutes, ...blogRoutes, ...authorRoutes, ...glossaryRoutes];
}
