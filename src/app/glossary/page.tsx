import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getPublishedTerms } from '@/lib/glossaryDb';
import { letterOf } from '@/lib/glossary';
import GlossaryIndex from '@/components/glossary/GlossaryIndex';
import { ld } from '@/components/blog/jsonLd';

const BASE = 'https://www.scripwise.co.in';

const META: Metadata = {
  title: 'Stock Market Glossary: Indian Investing Terms Explained',
  description: 'Plain-language meanings of Indian stock market and investing terms, from SIP and NAV to repo rate and P/E ratio, with how each works in India.',
  alternates: { canonical: '/glossary' },
  openGraph: { type: 'website', url: `${BASE}/glossary`, title: 'Scripwise Glossary: Indian Investing Terms Explained' },
};

// Kept out of search results until the first term is live.
export async function generateMetadata(): Promise<Metadata> {
  return (await getPublishedTerms()).length ? META : { ...META, robots: { index: false, follow: true } };
}

export default async function GlossaryHub() {
  const terms = await getPublishedTerms();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const items = terms
    .map(t => ({ slug: t.slug, term: t.term, definition: t.definition, letter: letterOf(t.term) }))
    .sort((a, b) => (a.letter === b.letter ? a.term.localeCompare(b.term) : a.letter === '#' ? 1 : b.letter === '#' ? -1 : a.letter.localeCompare(b.letter)));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': `${BASE}/glossary`,
    name: 'Scripwise Glossary',
    url: `${BASE}/glossary`,
    inLanguage: 'en-IN',
    hasDefinedTerm: items.map(i => ({ '@type': 'DefinedTerm', name: i.term, description: i.definition, url: `${BASE}/glossary/${i.slug}` })),
  };

  return (
    <div>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(jsonLd) }} />
      <header className="hero-dark relative overflow-hidden">
        <div className="hero-grid" />
        <div className="relative mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-xs text-white/50">
            <Link href="/" className="hover:text-white">Home</Link> / Glossary
          </nav>
          <h1 className="text-3xl font-bold text-white md:text-5xl">Stock market glossary</h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Indian stock market and investing terms in plain words: what each one means and how it works in India.
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        {items.length ? <GlossaryIndex items={items} /> : <p className="text-[#4A5568]">The first terms are on their way.</p>}
      </div>
    </div>
  );
}
