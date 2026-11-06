import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import SubPage from '@/components/election/SubPage';
import { getElectionData } from '@/lib/election/db';
import { BASE } from '@/lib/election/content';
import { KEY_RACES, MIN_UPDATES_TO_INDEX, parseRace, racePath, raceUpdates } from '@/lib/election/sections';
import { pageTitle } from '@/lib/liveLinks';
import type { Chamber } from '@/lib/election/types';

type Props = { params: Promise<{ race: string }> };

const heading = (name: string) => `${name.replace(/ race$/, ' Race')} 2026: Live Results and Updates`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { race } = await params;
  const info = parseRace(race);
  if (!info) return { title: 'Not found', robots: { index: false } };
  const { updates } = await getElectionData();
  const n = raceUpdates(race, updates).length;
  const title = heading(info.name);
  const description = `Live results and updates from the ${info.name} in the 2026 US midterm elections: race calls, forecasts and the latest reports, with sources.`;
  return {
    title: pageTitle(title),
    description,
    alternates: { canonical: racePath(race) },
    // A race page stays out of search results until it has enough to say.
    robots: n < MIN_UPDATES_TO_INDEX ? { index: false, follow: true } : undefined,
    openGraph: { type: 'article', url: `${BASE}${racePath(race)}`, title, description, images: [{ url: '/us-midterm-elections/opengraph-image', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/us-midterm-elections/opengraph-image'] },
  };
}

export default async function RacePage({ params }: Props) {
  const { race } = await params;
  const info = parseRace(race);
  const { updates, meta } = await getElectionData();
  const mine = raceUpdates(race, updates);
  if (!info || (mine.length === 0 && !KEY_RACES.includes(race))) notFound();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const what = info.kind === 'senate' ? `a US senator` : info.kind === 'governor' ? 'a governor' : `a member of the House of Representatives${info.district ? ` for District ${info.district}` : ''}`;
  const rule = info.kind === 'senate' ? 'A party needs 51 of the 100 seats to control the Senate.' : info.kind === 'house' ? 'A party needs 218 of the 435 seats to control the House.' : 'Thirty-six states are electing governors in 2026.';
  const faq = [
    { q: `When will the ${info.name} result be known?`, a: 'Some races are called on election night. Close contests, mail ballots and recounts can delay a call by days.' },
    { q: `What is at stake in the ${info.name}?`, a: `Voters in ${info.state} are choosing ${what}. ${rule}` },
    ...(race === 'georgia-senate' ? [{ q: 'What happens if no candidate wins a majority in Georgia?', a: 'As per Al Jazeera, a Georgia Senate race with no majority winner goes to a runoff on 1 December.' }] : []),
    ...(race === 'alaska-senate' ? [{ q: 'When will the Alaska count be complete?', a: 'As per CBS News, Alaska has said its ranked-choice results will not be complete until 18 November.' }] : []),
  ];
  const chambers: Chamber[] | undefined = info.kind === 'senate' ? ['senate'] : info.kind === 'house' ? ['house'] : ['governors'];
  return (
    <SubPage
      url={`${BASE}${racePath(race)}`} crumb={info.name} h1={heading(info.name)}
      intro={`Voters in ${info.state} are choosing ${what} in the midterm elections of 3 November 2026. This page carries the reports on this race as they come in.`}
      description={`Live results and updates from the ${info.name} in the 2026 US midterm elections.`}
      updates={mine} meta={meta} faq={faq} chambers={chambers} nonce={nonce}
      about={KEY_RACES.includes(race) ? (
        <p className="leading-relaxed text-[#4A5568]">CBS News lists {info.state} among the battleground Senate races of the 2026 midterm elections. {rule}</p>
      ) : undefined}
    />
  );
}
