import Link from 'next/link';
import type { ReactNode } from 'react';
import ShareBar from '@/components/blog/ShareBar';
import ContentDisclaimer from '@/components/blog/ContentDisclaimer';
import { ld } from '@/components/blog/jsonLd';
import LiveTimeline from './LiveTimeline';
import Projections from './Projections';
import PtTime from './PtTime';
import ScoreCards from './ScoreCards';
import { ELECTION_PATH } from '@/lib/election/nav';
import { subPageLd } from '@/lib/election/jsonld';
import { BASE, PAGE_TITLE } from '@/lib/election/content';
import type { Chamber, ElectionMeta, ElectionUpdate } from '@/lib/election/types';

interface Props {
  url: string; crumb: string; h1: string; intro: string; description: string;
  updates: ElectionUpdate[]; meta: ElectionMeta | null; faq: { q: string; a: string }[];
  chambers?: Chamber[]; about?: ReactNode; top?: ReactNode; nonce?: string;
}

/** Layout shared by the section pages (Senate, House, Governors, Markets) and the race pages.
 *  The only link to other election pages is the one back to the main live page. */
export default function SubPage({ url, crumb, h1, intro, description, updates, meta, faq, chambers, about, top, nonce }: Props) {
  const ended = !!meta?.coverageEnded;
  const latest = updates[0]?.publishedAt;
  const projections = (meta?.projections ?? []).filter(p => !chambers || chambers.includes(p.chamber));
  const jsonLd = subPageLd({
    url, title: h1, description, updates, faq, meta,
    crumbs: [{ name: 'Home', url: BASE }, { name: PAGE_TITLE, url: `${BASE}${ELECTION_PATH}` }, { name: crumb, url }],
  });
  return (
    <div className="bg-[#F4F6FA]">
      {jsonLd.map((d, i) => <script key={i} type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(d) }} />)}

      <header className="hero-dark relative overflow-hidden">
        <div className="hero-grid" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#F97316]/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-9 md:px-6 md:py-12">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-white/50">
            <Link href="/" className="inline-block py-1.5 hover:text-white">Home</Link> /{' '}
            <Link href={ELECTION_PATH} className="inline-block py-1.5 hover:text-white">US Midterm Elections 2026</Link> / <span>{crumb}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {ended ? (
              <span className="rounded-full bg-green-500/15 px-3 py-1 font-bold uppercase tracking-wide text-green-300">Final results</span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 font-bold uppercase tracking-wide text-red-300">
                <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden /> Live
              </span>
            )}
            {meta?.lastIngestAt && !ended && <span className="text-white/70">Checked <PtTime iso={meta.lastIngestAt} /></span>}
            {latest && <span className="text-white/50">Latest update <PtTime iso={latest} /></span>}
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-[1.1] tracking-tight text-white md:text-5xl">{h1}</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg">{intro}</p>
          {chambers && chambers.length > 0 && <div className="mt-6"><ScoreCards board={meta?.scoreboard ?? {}} projections={meta?.projections ?? []} only={chambers} /></div>}
          <div className="mt-6"><ShareBar compact url={url} title={h1} /></div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        {top && <div className="mb-10">{top}</div>}
        <Projections items={projections} />
        <section id="timeline" aria-labelledby="timeline-h" className="scroll-mt-24">
          <h2 id="timeline-h" className="mb-5 text-2xl font-extrabold tracking-tight text-[#0D1117]">Latest updates</h2>
          <LiveTimeline updates={updates.slice(0, 50)} simple />
        </section>

        {about && <section className="mt-12 rounded-2xl bg-white p-5 ring-1 ring-[#E5E7EB]">{about}</section>}

        <section aria-labelledby="faq" className="mt-12">
          <h2 id="faq" className="mb-4 text-2xl font-extrabold tracking-tight text-[#0D1117]">Frequently asked questions</h2>
          <div className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB] bg-white">
            {faq.map(f => (
              <div key={f.q} className="p-5">
                <h3 className="mb-1 font-semibold text-[#0D1117]">{f.q}</h3>
                <p className="leading-relaxed text-[#4A5568]">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 text-center">
          <Link href={ELECTION_PATH} className="inline-flex min-h-11 items-center rounded-full bg-[#0D1117] px-6 text-sm font-semibold text-white hover:bg-[#1F2937]">← Back to the full live coverage</Link>
        </p>
        <ContentDisclaimer sourced />
      </main>
    </div>
  );
}
