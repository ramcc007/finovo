import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { getPublishedPosts } from '@/lib/blogDb';
import { slugify } from '@/lib/blog';
import { getPublishedTerms } from '@/lib/glossaryDb';

const base = 'https://www.scripwise.co.in';

const POSTS_PER_PAGE = 9; // keep in step with BlogListing

// No <lastmod> is emitted: the sitemap lists URLs only.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await getPublishedPosts(); // newest publish date first

  const blogRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/blog`, changeFrequency: 'daily', priority: 0.8 },
    ...Array.from({ length: Math.max(0, Math.ceil(blogPosts.length / POSTS_PER_PAGE) - 1) }, (_, i) => {
      const pageNo = i + 2;
      return {
        url: `${base}/blog/page/${pageNo}`,
        changeFrequency: 'weekly' as const,
        priority: 0.4,
      };
    }),
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

  try {
    const { data } = await supabase.from('companies').select('symbol').eq('is_active', true).order('symbol');

    const stockRoutes: MetadataRoute.Sitemap = (data ?? []).map(c => ({
      // NSE symbols can contain characters like "&" (e.g. M&M) that are
      // invalid unescaped in XML — encode the path segment.
      url: `${base}/stocks/${encodeURIComponent(c.symbol)}`,
      changeFrequency: 'daily',
      priority: 0.6,
    }));

    return [...staticRoutes, ...blogRoutes, ...glossaryRoutes, ...stockRoutes];
  } catch {
    // DB unreachable at build/request time — ship the static routes rather than fail the sitemap entirely.
    return [...staticRoutes, ...blogRoutes, ...glossaryRoutes];
  }
}
