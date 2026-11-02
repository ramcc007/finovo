import { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/lib/blogDb';
import { slugify } from '@/lib/blog';
import { getPublishedTerms } from '@/lib/glossaryDb';

const base = 'https://www.scripwise.co.in';

// No <lastmod> is emitted: the sitemap lists URLs only. Paginated blog
// listings (/blog/page/N) and stock pages are deliberately not listed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await getPublishedPosts(); // newest publish date first

  const blogRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/blog`, changeFrequency: 'daily', priority: 0.8 },
    ...[...new Set(blogPosts.map(p => slugify(p.category)))].map(cat => ({
      url: `${base}/blog/category/${cat}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    ...blogPosts.map(p => ({
      url: `${base}/blog/${p.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  const glossaryTerms = await getPublishedTerms();
  const glossaryRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/glossary`, changeFrequency: 'weekly', priority: 0.7 },
    ...glossaryTerms.map(t => ({ url: `${base}/glossary/${t.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/screener`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/markets`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/pricing`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/screens`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/pulse`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/compare`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/signup`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/disclaimer`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/refund`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Stock pages (/stocks/[symbol]) are deliberately left out: thousands of
  // thin, data-only pages dilute the sitemap. They stay reachable by links.
  return [...staticRoutes, ...blogRoutes, ...glossaryRoutes];
}
