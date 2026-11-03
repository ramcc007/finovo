import { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/lib/blogDb';
import { modifiedAt, slugify } from '@/lib/blog';
import { getPublishedTerms } from '@/lib/glossaryDb';

const base = 'https://www.scripwise.co.in';

const lastMod = (publishedAt: string | null, updatedAt: string): Date | undefined => {
  const d = new Date(modifiedAt(publishedAt, updatedAt));
  return Number.isNaN(d.getTime()) ? undefined : d;
};

// Regenerated every 10 minutes (not frozen at deploy time), so posts and
// glossary terms published from the admin, or reaching their scheduled time,
// appear without a redeploy.
export const revalidate = 600;

// Posts and terms carry <lastmod>: the later of their publish time and last
// update, so a scheduled item that just went live (edited before its publish
// time) shows its go-live time. changefreq and priority are left out: Google
// ignores them. Paginated blog listings (/blog/page/N) and stock pages are
// deliberately not listed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await getPublishedPosts(); // newest publish date first

  const blogRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/blog` },
    ...[...new Set(blogPosts.map(p => slugify(p.category)))].map(cat => ({
      url: `${base}/blog/category/${cat}`,
    })),
    ...blogPosts.map(p => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: lastMod(p.publishedAt, p.updatedAt),
    })),
  ];

  const glossaryTerms = await getPublishedTerms();
  const glossaryRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/glossary` },
    ...glossaryTerms.map(t => ({ url: `${base}/glossary/${t.slug}`, lastModified: lastMod(t.publishedAt, t.updatedAt) })),
  ];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base },
    { url: `${base}/screener` },
    { url: `${base}/markets` },
    { url: `${base}/pricing` },
    { url: `${base}/screens` },
    { url: `${base}/us-midterm-elections` },
    { url: `${base}/pulse` },
    { url: `${base}/compare` },
    { url: `${base}/signup` },
    { url: `${base}/contact` },
    { url: `${base}/disclaimer` },
    { url: `${base}/privacy` },
    { url: `${base}/refund` },
    { url: `${base}/terms` },
  ];

  // Stock pages (/stocks/[symbol]) are deliberately left out: thousands of
  // thin, data-only pages dilute the sitemap. They stay reachable by links.
  return [...staticRoutes, ...blogRoutes, ...glossaryRoutes];
}
