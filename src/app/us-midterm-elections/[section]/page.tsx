import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import SubPage from '@/components/election/SubPage';
import { getElectionData, getRaceResults } from '@/lib/election/db';
import ElectionMap from '@/components/election/ElectionMap';
import { BASE } from '@/lib/election/content';
import { SECTIONS, isSection, sectionUpdates } from '@/lib/election/sections';
import { pageTitle } from '@/lib/liveLinks';

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  if (!isSection(section)) return { title: 'Not found', robots: { index: false } };
  const s = SECTIONS[section];
  const { updates } = await getElectionData();
  const url = `${BASE}${s.path}`;
  return {
    title: pageTitle(s.title),
    description: s.description,
    alternates: { canonical: s.path },
    robots: sectionUpdates(s, updates).length === 0 ? { index: false, follow: true } : undefined,
    openGraph: { type: 'article', url, title: s.title, description: s.description },
    twitter: { card: 'summary_large_image', title: s.title, description: s.description },
  };
}

export default async function SectionPage({ params }: Props) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const s = SECTIONS[section];
  const { updates, meta } = await getElectionData();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const mapped = section === 'senate' || section === 'governors';
  const races = mapped ? await getRaceResults(meta) : [];
  return (
    <SubPage
      url={`${BASE}${s.path}`} crumb={s.name} h1={s.h1} intro={s.intro} description={s.description}
      updates={sectionUpdates(s, updates)} meta={meta} faq={s.faq} nonce={nonce}
      top={mapped ? <ElectionMap races={races} updatedAt={meta?.lastIngestAt ?? null} initial={section === 'governors' ? 'governor' : 'senate'} /> : undefined}
      chambers={section === 'markets' ? undefined : [section === 'governors' ? 'governors' : section]}
    />
  );
}
