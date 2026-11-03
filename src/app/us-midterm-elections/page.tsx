import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import ShareBar from '@/components/blog/ShareBar';
import ContentDisclaimer from '@/components/blog/ContentDisclaimer';
import { ld } from '@/components/blog/jsonLd';
import LiveTimeline, { anchorOf } from '@/components/election/LiveTimeline';
import LocalTime from '@/components/election/LocalTime';
import Scoreboard from '@/components/election/Scoreboard';
import { getElectionData } from '@/lib/election/db';
import { BASE, FAQ, HOW_IT_WORKS, INTRO, PAGE_DESCRIPTION, PAGE_TITLE, PAGE_URL } from '@/lib/election/content';
import { pageTitle } from '@/lib/liveLinks';

const STEP = 50;

export async function generateMetadata(): Promise<Metadata> {
  const { updates } = await getElectionData();
  const modified = updates[0]?.publishedAt;
  return {
    title: pageTitle(PAGE_TITLE),
    description: PAGE_DESCRIPTION,
    keywords: ['us midterm elections 2026', 'midterm election results', 'senate control', 'house control', 'us election markets', 'midterms impact on nifty'],
    alternates: {
      canonical: '/us-midterm-elections',
      types: { 'application/rss+xml': '/us-midterm-elections/feed.xml', 'application/feed+json': '/us-midterm-elections/feed.json' },
    },
    openGraph: { type: 'article', url: PAGE_URL, title: PAGE_TITLE, description: PAGE_DESCRIPTION, section: 'US Elections', ...(modified ? { modifiedTime: modified } : {}) },
    twitter: { card: 'summary_large_image', title: PAGE_TITLE, description: PAGE_DESCRIPTION },
  };
}

export default async function ElectionPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  const limit = Math.min(1000, Math.max(STEP, Math.round(Number(n) / STEP) * STEP || STEP));
  const { updates, meta } = await getElectionData();
  const visible = updates.slice(0, limit);
  const ended = !!meta?.coverageEnded;
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const latest = updates[0]?.publishedAt;
  const publisher = { '@type': 'Organization', name: 'Scripwise', url: BASE };

  const jsonLd: unknown[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'LiveBlogPosting',
      headline: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: PAGE_URL,
      mainEntityOfPage: { '@type': 'WebPage', '@id': PAGE_URL },
      inLanguage: 'en',
      coverageStartTime: meta?.startedAt ?? '2026-11-03T00:00:00Z',
      ...(ended && meta?.endedAt ? { coverageEndTime: meta.endedAt } : {}),
      datePublished: meta?.startedAt ?? '2026-11-03T00:00:00Z',
      dateModified: latest ?? meta?.startedAt ?? '2026-11-03T00:00:00Z',
      author: { '@type': 'Organization', name: 'Scripwise Desk', url: BASE },
      publisher,
      about: { '@type': 'Event', name: '2026 United States elections', startDate: '2026-11-03', location: { '@type': 'Country', name: 'United States' } },
      liveBlogUpdate: visible.slice(0, 50).map(u => ({
        '@type': 'BlogPosting',
        headline: u.headline,
        url: `${PAGE_URL}#${anchorOf(u.id)}`,
        datePublished: u.publishedAt,
        articleBody: u.marketImpact ? `${u.summary} Market impact: ${u.marketImpact}` : u.summary,
        author: { '@type': 'Organization', name: 'Scripwise Desk' },
        citation: u.sources.map(s => ({ '@type': 'CreativeWork', name: s.name, url: s.url })),
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'US Midterm Elections 2026', item: PAGE_URL },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];

  return (
    <div>
      {jsonLd.map((d, i) => <script key={i} type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(d) }} />)}

      <header className="hero-dark relative overflow-hidden">
        <div className="hero-grid" />
        <div className="relative mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-5 text-xs text-white/50">
            <Link href="/" className="inline-block py-1.5 hover:text-white">Home</Link> / <span>US Midterm Elections 2026</span>
          </nav>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {ended ? (
              <span className="rounded-full bg-green-500/15 px-3 py-1 font-bold uppercase tracking-wide text-green-300">Final results</span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 font-bold uppercase tracking-wide text-red-300">
                <span className="relative flex h-2 w-2" aria-hidden><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" /></span>
                Live
              </span>
            )}
            {latest && <span className="text-white/60">Updated <LocalTime iso={latest} /></span>}
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl">{PAGE_TITLE}</h1>
          <p className="mt-4 text-base leading-relaxed text-white/70 md:text-lg">{INTRO}</p>
          <div className="mt-6"><ShareBar compact url={PAGE_URL} title={PAGE_TITLE} /></div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
        <Scoreboard board={meta?.scoreboard ?? {}} />

        {meta && meta.takeaways.length > 0 && (
          <section aria-labelledby="where" className="mt-8 rounded-2xl border border-[#FFEDD5] border-l-4 border-l-[#F97316] bg-[#FFF7ED] p-5 md:p-6">
            <h2 id="where" className="mb-3 font-bold text-[#0D1117]">Where things stand</h2>
            <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[#4A5568]">
              {meta.takeaways.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </section>
        )}

        <section id="timeline" aria-labelledby="timeline-h" className="mt-10 scroll-mt-20">
          <h2 id="timeline-h" className="mb-5 text-2xl font-bold text-[#0D1117]">Timeline of updates</h2>
          <LiveTimeline updates={visible} />
          {updates.length > limit && (
            <div className="mt-8 text-center">
              <Link href={`/us-midterm-elections?n=${limit + STEP}#timeline`} rel="nofollow" className="inline-flex min-h-10 items-center rounded-lg border border-[#E5E7EB] bg-white px-5 text-sm font-semibold text-[#0D1117] hover:border-[#F97316]">
                Load more updates
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="faq" className="mt-14">
          <h2 id="faq" className="mb-4 text-2xl font-bold text-[#0D1117]">Frequently asked questions</h2>
          <div className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB] bg-white">
            {FAQ.map(f => (
              <div key={f.q} className="p-5">
                <h3 className="mb-1 font-semibold text-[#0D1117]">{f.q}</h3>
                <p className="leading-relaxed text-[#4A5568]">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="how" className="mt-12">
          <h2 id="how" className="mb-2 text-lg font-bold text-[#0D1117]">How this page works</h2>
          <p className="text-[15px] leading-relaxed text-[#4A5568]">{HOW_IT_WORKS}</p>
          <p className="mt-3 text-sm text-[#8A96A8]">
            Follow updates by RSS: <a href="/us-midterm-elections/feed.xml" className="font-semibold text-[#EA580C] hover:underline">feed.xml</a> or{' '}
            <a href="/us-midterm-elections/feed.json" className="font-semibold text-[#EA580C] hover:underline">feed.json</a>.
          </p>
        </section>

        <ContentDisclaimer sourced />
        <p className="mt-4 text-sm leading-relaxed text-[#8A96A8]">
          This page reports on elections and takes no political side. Nothing here supports or opposes any party or candidate.
        </p>

        <section className="mt-12 rounded-2xl bg-[#0B0E14] p-6 text-white md:p-8">
          <h2 className="text-xl font-bold">Screen stocks yourself</h2>
          <p className="mb-4 mt-1 text-sm text-white/60">Run quality filters on 5,000+ NSE and BSE companies with Scripwise, free.</p>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/screens" className="rounded-lg bg-[#F97316] px-4 py-2 text-white hover:bg-[#EA580C]">Open pre-built screens</Link>
            <Link href="/screener" className="rounded-lg border border-white/20 px-4 py-2 text-white hover:border-[#F97316]">Stock Explorer</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
