import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getPublishedTerms } from '@/lib/glossaryDb';
import { letterOf } from '@/lib/glossary';
import GlossaryIndex from '@/components/glossary/GlossaryIndex';
import { PostCard } from '@/components/blog/PostCard';
import { getPublishedPosts } from '@/lib/blogDb';
import { GLOSSARY_FAQ, LEARNING_PATHS, POPULAR_TERMS } from '@/lib/glossaryHub';
import { ArrowRight, BarChart3, LineChart, Scale } from 'lucide-react';
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

const WEEK = 7 * 86_400_000;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

function newestSlugs(terms: { slug: string; publishedAt: string | null }[]): string[] {
  const recent = terms.filter(t => t.publishedAt && Date.now() - Date.parse(t.publishedAt) < WEEK).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  return recent.length > 0 && recent.length <= terms.length / 2 ? recent.slice(0, 6).map(t => t.slug) : [];
}

export default async function GlossaryHub() {
  const terms = await getPublishedTerms();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const items = terms
    .map(t => ({ slug: t.slug, term: t.term, definition: t.definition, letter: letterOf(t.term), category: t.category, minutes: t.readingMinutes || 2 }))
    .sort((a, b) => (a.letter === b.letter ? a.term.localeCompare(b.term) : a.letter === '#' ? 1 : b.letter === '#' ? -1 : a.letter.localeCompare(b.letter)));

  const find = (name: string) => items.find(i => norm(i.term) === norm(name)) ?? items.find(i => norm(i.term).startsWith(norm(name)));
  const refs = (names: string[]) => names.map(find).filter((i): i is (typeof items)[number] => !!i).map(i => ({ slug: i.slug, term: i.term }));
  const popular = refs(POPULAR_TERMS);
  const paths = LEARNING_PATHS.map(p => ({ id: p.id, title: p.title, blurb: p.blurb, terms: refs(p.terms) })).filter(p => p.terms.length >= 3);

  // "New this week" only means something when most terms are not new, so it hides itself right after a bulk import.
  const newest = newestSlugs(terms);

  const guides = (await getPublishedPosts().catch(() => [])).slice(0, 3);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTermSet',
      '@id': `${BASE}/glossary`,
      name: 'Scripwise Glossary',
      url: `${BASE}/glossary`,
      inLanguage: 'en-IN',
      hasDefinedTerm: items.map(i => ({ '@type': 'DefinedTerm', name: i.term, description: i.definition, url: `${BASE}/glossary/${i.slug}` })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: GLOSSARY_FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];

  const ctas = [
    { href: '/screener', icon: BarChart3, title: 'Put the ratios to work', text: 'Filter stocks by P/E, ROE, debt and more in the Scripwise screener.' },
    { href: '/markets', icon: LineChart, title: 'Follow the market', text: 'See Nifty 50, Sensex and sector moves on the markets page.' },
    { href: '/compare', icon: Scale, title: 'Compare two stocks', text: 'Set companies side by side on the numbers this glossary explains.' },
  ];

  return (
    <div>
      {jsonLd.map((d, n) => <script key={n} type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(d) }} />)}
      {items.length ? <GlossaryIndex items={items} popular={popular} paths={paths} newest={newest} /> : (
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6"><h1 className="text-3xl font-bold text-[#0D1117]">Stock market glossary</h1><p className="mt-3 text-[#4A5568]">The first terms are on their way.</p></div>
      )}

      {items.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 pb-14 md:px-6">
          <section aria-labelledby="cta-h" className="mt-4">
            <h2 id="cta-h" className="text-2xl font-extrabold tracking-tight text-[#0D1117]">Use what you learn</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {ctas.map(c => (
                <Link key={c.href} href={c.href} className="group rounded-2xl border border-[#E5E7EB] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#F97316] hover:shadow-md">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#EA580C]"><c.icon size={20} aria-hidden /></span>
                  <span className="mt-3 flex items-center gap-1.5 font-bold text-[#0D1117]">{c.title}<ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
                  <span className="mt-1 block text-sm text-[#4A5568]">{c.text}</span>
                </Link>
              ))}
            </div>
          </section>

          {guides.length > 0 && (
            <section aria-labelledby="guides-h" className="mt-12">
              <div className="flex items-end justify-between gap-2">
                <h2 id="guides-h" className="text-2xl font-extrabold tracking-tight text-[#0D1117]">From the Scripwise blog</h2>
                <Link href="/blog" className="text-sm font-semibold text-[#EA580C] hover:underline">All articles</Link>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {guides.map(p => <PostCard key={p.slug} post={p} headingLevel={3} />)}
              </div>
            </section>
          )}

          <section aria-labelledby="faq-h" className="mt-12">
            <h2 id="faq-h" className="mb-4 text-2xl font-extrabold tracking-tight text-[#0D1117]">Frequently asked questions</h2>
            <div className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB] bg-white">
              {GLOSSARY_FAQ.map(f => (
                <details key={f.q} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-[#0D1117]">{f.q}<span aria-hidden className="text-xl text-[#9CA3AF] transition-transform group-open:rotate-45">+</span></summary>
                  <p className="mt-2 leading-relaxed text-[#4A5568]">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
