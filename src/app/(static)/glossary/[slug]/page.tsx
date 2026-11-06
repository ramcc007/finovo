import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedTerm, getPublishedTerms } from '@/lib/glossaryDb';
import type { GlossaryTerm } from '@/lib/glossary';
import { modifiedAt, stripHtml } from '@/lib/blog';
import GlossaryArticle from '@/components/glossary/GlossaryArticle';
import { ld } from '@/components/blog/jsonLd';
import { liveInternalPaths, pageTitle, unlinkNotLive } from '@/lib/liveLinks';
import { enhanceContent } from '@/lib/enhance';

const BASE = 'https://www.scripwise.co.in';

// Cached and refreshed every 5 minutes (admin saves also invalidate the data cache). An empty list means pages are
// built on first request, then served from cache, instead of being rendered for every visitor.
export const revalidate = 300;
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = await getPublishedTerm((await params).slug);
  if (!t) return { title: 'Term not found', robots: { index: false } };
  const description = t.metaDescription || t.definition;
  return {
    title: pageTitle(t.title),
    description,
    keywords: t.tags,
    alternates: { canonical: `/glossary/${t.slug}` },
    openGraph: {
      type: 'article', siteName: 'Scripwise', locale: 'en_IN', url: `${BASE}/glossary/${t.slug}`, title: t.title, description,
      publishedTime: t.publishedAt ?? undefined, modifiedTime: modifiedAt(t.publishedAt, t.updatedAt),
    },
    // twitter-image.tsx renders a large card.
    twitter: { card: 'summary_large_image', title: t.title, description },
  };
}

/** Related terms that are live: the writer's picks first, then terms sharing a tag, 3 to 5 in all. */
function relatedOf(t: GlossaryTerm, all: GlossaryTerm[]): { slug: string; term: string }[] {
  const live = new Map(all.filter(x => x.slug !== t.slug).map(x => [x.slug, x]));
  const out = t.related.map(s => live.get(s)).filter((x): x is GlossaryTerm => !!x);
  if (out.length < 3) {
    const tags = new Set(t.tags.map(x => x.toLowerCase()));
    for (const x of live.values()) {
      if (out.length >= 3) break;
      if (!out.includes(x) && x.tags.some(g => tags.has(g.toLowerCase()))) out.push(x);
    }
  }
  return out.slice(0, 5).map(x => ({ slug: x.slug, term: x.term }));
}

export default async function GlossaryTermPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getPublishedTerm((await params).slug);
  if (!t) notFound();
  const nonce: string | undefined = undefined; // JSON-LD blocks are data, not executed script, so they need no CSP nonce
  const url = `${BASE}/glossary/${t.slug}`;
  const all = await getPublishedTerms();
  const related = relatedOf(t, all);
  const sorted = [...all].sort((a, b) => a.term.localeCompare(b.term));
  const at = sorted.findIndex(x => x.slug === t.slug);
  const shownSlugs = new Set([t.slug, ...related.map(r => r.slug)]);
  const more = all.filter(x => x.category === t.category && !shownSlugs.has(x.slug)).slice(0, 6).map(x => ({ slug: x.slug, term: x.term, definition: x.definition }));
  const prev = at > 0 ? { slug: sorted[at - 1].slug, term: sorted[at - 1].term } : null;
  const next = at >= 0 && at < sorted.length - 1 ? { slug: sorted[at + 1].slug, term: sorted[at + 1].term } : null;

  const jsonLd: unknown[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      '@id': url,
      name: t.term,
      description: t.definition,
      url,
      inDefinedTermSet: { '@type': 'DefinedTermSet', '@id': `${BASE}/glossary`, name: 'Scripwise Glossary', url: `${BASE}/glossary` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: t.title,
      description: t.metaDescription || t.definition,
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      about: { '@id': url },
      image: [`${url}/opengraph-image`],
      datePublished: t.publishedAt,
      dateModified: modifiedAt(t.publishedAt, t.updatedAt),
      author: { '@type': 'Organization', name: 'Scripwise', url: BASE },
      publisher: { '@type': 'Organization', name: 'Scripwise', url: BASE },
      inLanguage: 'en-IN',
      wordCount: stripHtml(t.contentHtml).split(' ').filter(Boolean).length,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Glossary', item: `${BASE}/glossary` },
        { '@type': 'ListItem', position: 3, name: t.term, item: url },
      ],
    },
  ];
  if (t.faq.length > 0) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: t.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }

  return (
    <>
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(d) }} />
      ))}
      <GlossaryArticle
        term={t}
        aids={enhanceContent(unlinkNotLive(t.contentHtml, await liveInternalPaths()), {
          glossary: (await getPublishedTerms()).map(x => ({ slug: x.slug, term: x.term, definition: x.definition })),
          selfSlug: t.slug,
          maxTerms: 3,
        })}
        related={related}
        more={more}
        prev={prev}
        next={next}
      />
    </>
  );
}
