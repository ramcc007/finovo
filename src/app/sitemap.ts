import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const base = 'https://www.scripwise.co.in';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/screener`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/markets`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/screens`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/compare`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/calendar`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/disclaimer`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  try {
    const { data } = await supabase
      .from('companies')
      .select('symbol')
      .eq('is_active', true)
      .order('symbol');

    const stockRoutes: MetadataRoute.Sitemap = (data ?? []).map(c => ({
      url: `${base}/stocks/${c.symbol}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    }));

    return [...staticRoutes, ...stockRoutes];
  } catch {
    // DB unreachable at build/request time — ship the static routes rather than fail the sitemap entirely.
    return staticRoutes;
  }
}
