import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import ShareBar from '@/components/blog/ShareBar';
import { Rss } from 'lucide-react';
import ContentDisclaimer from '@/components/blog/ContentDisclaimer';
import { ld } from '@/components/blog/jsonLd';
import LiveTimeline from '@/components/election/LiveTimeline';
import PtTime from '@/components/election/PtTime';
import ScoreCards from '@/components/election/ScoreCards';
import YouTubeLite from '@/components/election/YouTubeLite';
import Projections from '@/components/election/Projections';
import LiveRefresh from '@/components/election/LiveRefresh';
import BookmarkButton from '@/components/election/BookmarkButton';
import { getElectionData } from '@/lib/election/db';
import { BASE, FAQ, HOW_IT_WORKS, INTRO, PAGE_DESCRIPTION, PAGE_TITLE, PAGE_URL } from '@/lib/election/content';
import { pageTitle } from '@/lib/liveLinks';
import { anchorOf } from '@/lib/election/types';

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
      types: { 'application/rss+xml': '/us-midterm-elections/feed.xml', 'application/feed+json': '/us-midterm-elections/feed.json', 'text/markdown': '/us-midterm-elections/index.md' },
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
      publisher: { ...publisher, logo: { '@type': 'ImageObject', url: `${BASE}/icon` } },
      image: [`${PAGE_URL}/opengraph-image`],
      isAccessibleForFree: true,
      keywords: 'US midterm elections 2026, midterm election results, Senate, House of Representatives, governors, market impact, Nifty, euro, dollar',
      copyrightHolder: publisher,
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
    <div className="bg-[#F4F6FA]">
      {jsonLd.map((d, i) => <script key={i} type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(d) }} />)}

      <LiveRefresh latestIso={latest ?? null} enabled={!ended} />

      <header className="hero-dark relative overflow-hidden">
        <div className="hero-grid" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#F97316]/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#3B82F6]/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
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
            {meta?.lastIngestAt && !ended && <span className="text-white/70">Checked <PtTime iso={meta.lastIngestAt} /></span>}
            {latest && <span className="text-white/50">Latest update <PtTime iso={latest} /></span>}
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
            US Midterm Elections 2026: <span className="bg-gradient-to-r from-[#FB923C] to-[#FDBA74] bg-clip-text text-transparent">Live Updates and Results</span>
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg">{INTRO}</p>

          <div className="mt-7"><ScoreCards board={meta?.scoreboard ?? {}} projections={meta?.projections ?? []} /></div>

          <div className="mt-6 flex flex-wrap items-start gap-x-6 gap-y-4">
            <ShareBar compact url={PAGE_URL} title={PAGE_TITLE} />
            <BookmarkButton dark url={PAGE_URL} title={PAGE_TITLE} />
          </div>
          <nav aria-label="On this page" className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-white/70">
            {(meta?.projections.length ?? 0) > 0 && <a href="#proj-h" className="inline-flex min-h-8 items-center hover:text-white">Projections</a>}
            <a href="#timeline" className="inline-flex min-h-8 items-center hover:text-white">Timeline</a>
            {(meta?.videos.length ?? 0) > 0 && <a href="#watch" className="inline-flex min-h-8 items-center hover:text-white">Watch live</a>}
            <a href="#faq" className="inline-flex min-h-8 items-center hover:text-white">FAQ</a>
            <a href="#how" className="inline-flex min-h-8 items-center hover:text-white">How this page works</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
          <div className="min-w-0 lg:order-1">
            {(meta?.videos.length ?? 0) > 0 && (
              <section id="watch" aria-labelledby="watch-h" className="mb-10 scroll-mt-24 rounded-2xl bg-[#0B0E14] p-4 sm:p-5">
                <h2 id="watch-h" className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
                  <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden /> Watch live coverage
                </h2>
                <div className={`grid gap-4 ${meta!.videos.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                  {meta!.videos.map(v => <YouTubeLite key={`${v.kind}-${v.id}`} dark kind={v.kind} id={v.id} title={v.title} credit={v.credit} />)}
                </div>
              </section>
            )}

            <Projections items={meta?.projections ?? []} />

            <section id="timeline" aria-labelledby="timeline-h" className="scroll-mt-24">
              <h2 id="timeline-h" className="mb-5 text-2xl font-extrabold tracking-tight text-[#0D1117]">Timeline of updates</h2>
              <LiveTimeline updates={visible} />
              {updates.length > limit && (
                <div className="mt-8 text-center">
                  <Link href={`/us-midterm-elections?n=${limit + STEP}#timeline`} rel="nofollow" className="inline-flex min-h-11 items-center rounded-full bg-[#0D1117] px-6 text-sm font-semibold text-white hover:bg-[#1F2937]">
                    Load more updates
                  </Link>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5 lg:order-2 lg:self-start lg:sticky lg:top-24">
            {meta && meta.takeaways.length > 0 && (
              <section aria-labelledby="where" className="rounded-2xl border border-[#FFEDD5] border-l-4 border-l-[#F97316] bg-[#FFF7ED] p-5">
                <h2 id="where" className="mb-3 font-bold text-[#0D1117]">Where things stand</h2>
                <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[#4A5568]">
                  {meta.takeaways.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </section>
            )}
            <section aria-labelledby="follow" className="rounded-2xl bg-white p-5 ring-1 ring-[#E5E7EB]">
              <h2 id="follow" className="mb-1 font-bold text-[#0D1117]">Keep this page handy</h2>
              <p className="mb-3 text-sm leading-relaxed text-[#4A5568]">Bookmark it, or follow the feed in a reader of your choice. The page refreshes by itself while it stays open.</p>
              <div className="flex flex-wrap gap-2">
                <BookmarkButton url={PAGE_URL} title={PAGE_TITLE} />
                <a href="/us-midterm-elections/feed.xml" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 text-sm font-semibold hover:border-[#F97316]"><Rss size={16} aria-hidden /> RSS feed</a>
              </div>
            </section>
            <section className="rounded-2xl bg-[#0B0E14] p-5 text-white">
              <h2 className="font-bold">Screen stocks yourself</h2>
              <p className="mb-4 mt-1 text-sm text-white/60">Run quality filters on 5,000+ NSE and BSE companies with Scripwise, free.</p>
              <div className="flex flex-wrap gap-2 text-sm font-semibold">
                <Link href="/screens" className="inline-flex min-h-10 items-center rounded-lg bg-[#F97316] px-4 text-white hover:bg-[#EA580C]">Pre-built screens</Link>
                <Link href="/screener" className="inline-flex min-h-10 items-center rounded-lg border border-white/20 px-4 text-white hover:border-[#F97316]">Stock Explorer</Link>
              </div>
            </section>
          </aside>
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
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

        <section aria-labelledby="cite" className="mt-10">
          <h2 id="cite" className="mb-2 text-lg font-bold text-[#0D1117]">Cite this page</h2>
          <p className="rounded-xl bg-white p-4 text-sm leading-relaxed text-[#4A5568] ring-1 ring-[#E5E7EB]">
            Scripwise Desk. &ldquo;{PAGE_TITLE}.&rdquo; Scripwise, {latest ? new Date(latest).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' }) : '3 November 2026'}. {PAGE_URL}
          </p>
        </section>

        <ContentDisclaimer sourced />
        <p className="mt-4 text-sm leading-relaxed text-[#8A96A8]">
          This page reports on elections and takes no political side. Nothing here supports or opposes any party or candidate.
        </p>

        </div>
      </main>
    </div>
  );
}
