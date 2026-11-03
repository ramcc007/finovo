import { BASE } from './content';
import { anchorOf, type ElectionMeta, type ElectionUpdate } from './types';

interface Args {
  url: string; title: string; description: string; crumbs: { name: string; url: string }[];
  updates: ElectionUpdate[]; faq: { q: string; a: string }[]; meta: ElectionMeta | null;
}

/** LiveBlogPosting + BreadcrumbList + FAQPage for a section or race page. */
export function subPageLd({ url, title, description, crumbs, updates, faq, meta }: Args): unknown[] {
  const publisher = { '@type': 'Organization', name: 'Scripwise', url: BASE, logo: { '@type': 'ImageObject', url: `${BASE}/icon` } };
  const start = meta?.startedAt ?? '2026-11-03T00:00:00Z';
  const ld: unknown[] = [
    {
      '@context': 'https://schema.org', '@type': 'LiveBlogPosting', headline: title, description, url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url }, inLanguage: 'en',
      coverageStartTime: start, ...(meta?.coverageEnded && meta.endedAt ? { coverageEndTime: meta.endedAt } : {}),
      datePublished: start, dateModified: updates[0]?.publishedAt ?? start,
      author: { '@type': 'Organization', name: 'Scripwise Desk', url: BASE }, publisher,
      image: [`${BASE}/us-midterm-elections/opengraph-image`], isAccessibleForFree: true,
      about: { '@type': 'Event', name: '2026 United States elections', startDate: '2026-11-03', location: { '@type': 'Country', name: 'United States' } },
      liveBlogUpdate: updates.slice(0, 50).map(u => ({
        '@type': 'BlogPosting', headline: u.headline, url: `${url}#${anchorOf(u.id)}`, datePublished: u.publishedAt,
        articleBody: u.marketImpact ? `${u.summary} Market impact: ${u.marketImpact}` : u.summary,
        author: { '@type': 'Organization', name: 'Scripwise Desk' },
        citation: u.sources.map(s => ({ '@type': 'CreativeWork', name: s.name, url: s.url })),
      })),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
    },
  ];
  if (faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  return ld;
}
