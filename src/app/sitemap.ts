import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://scripwise.in';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/screener`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/markets`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/screens`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/disclaimer`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];
}
