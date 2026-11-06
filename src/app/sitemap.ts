import { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/lib/blogDb';
import { slugify } from '@/lib/blog';
import { getPublishedTerms } from '@/lib/glossaryDb';
import { getElectionData } from '@/lib/election/db';
import { getAuthors } from '@/lib/authorsDb';
import { supabase } from '@/lib/supabase';
import { MIN_UPDATES_TO_INDEX, SECTION_IDS, SECTIONS, listRaces, racePath, sectionUpdates } from '@/lib/election/sections';

const base = 'https://www.scripwise.co.in';

// Regenerated every 10 minutes (not frozen at deploy time), so posts and
// glossary terms published from the admin, or reaching their scheduled time,
// appear without a redeploy.
export const revalidate = 300;

// Ram's rule (3 Nov 2026, repeated 6 Nov 2026): no <lastmod> on any URL, the election pages included;
// every URL carries <changefreq> and <priority> instead. Paginated blog listings (/blog/page/N) and stock pages are
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

  // Stock pages: only the largest companies, which have the fullest data and the most search interest. The long tail
  // stays reachable by links and is not offered to crawlers, so thin pages do not dilute the sitemap.
  let stockRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase.from('screener_view').select('symbol').not('market_cap', 'is', null).order('market_cap', { ascending: false }).limit(500);
    stockRoutes = (data ?? []).map(r => ({ url: `${base}/stocks/${encodeURIComponent(r.symbol as string)}`, changeFrequency: 'daily' as const, priority: 0.6 }));
  } catch { /* the sitemap still works without them */ }
  // Election section and race pages: only those with something to say.
  const { updates: electionUpdates, meta: electionMeta } = await getElectionData();
  // Coverage has ended: the pages no longer change, so they stop advertising hourly updates.
  const electionFreq = electionMeta?.coverageEnded ? ('monthly' as const) : ('hourly' as const);
  const electionRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/us-midterm-elections`, changeFrequency: electionFreq, priority: 0.8 },
    ...SECTION_IDS.filter(id => sectionUpdates(SECTIONS[id], electionUpdates).length > 0)
      .map(id => ({ url: `${base}${SECTIONS[id].path}`, changeFrequency: electionFreq, priority: 0.8 })),
    ...listRaces(electionUpdates).filter(r => r.count >= MIN_UPDATES_TO_INDEX)
        .map(r => ({ url: `${base}${racePath(r.slug)}`, changeFrequency: electionFreq, priority: 0.7 })),
  ];

  return [...staticRoutes, ...stockRoutes, ...electionRoutes, ...blogRoutes, ...authorRoutes, ...glossaryRoutes];
}
