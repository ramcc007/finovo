import { ELECTION_PATH } from './nav';
import type { ElectionUpdate, Tag } from './types';

export type SectionId = 'senate' | 'house' | 'governors' | 'markets';

export interface Section {
  id: SectionId;
  path: string;
  tag: Tag;
  name: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  faq: { q: string; a: string }[];
}

const b = ELECTION_PATH;

export const SECTIONS: Record<SectionId, Section> = {
  senate: {
    id: 'senate', path: `${b}/senate`, tag: 'senate', name: 'Senate',
    h1: 'US Senate Election 2026: Live Results and Updates',
    title: 'US Senate Election 2026: Live Results and Updates',
    description: 'Live results, projections and updates from the 2026 US Senate elections: which party will control the Senate, race calls, and what it means for markets.',
    intro: 'Thirty-five of the 100 Senate seats are on the ballot in the midterm elections of 3 November 2026. This page carries the Senate updates, race calls and forecasts as they are reported.',
    faq: [
      { q: 'How many seats does a party need to control the Senate?', a: 'A party needs 51 of the 100 seats. At 50 seats each, the Vice President casts the deciding vote.' },
      { q: 'How many Senate seats are being contested in 2026?', a: 'Thirty-five seats are on the ballot, as per Al Jazeera, along with all 435 House seats and 36 governor races.' },
      { q: 'What happens if no candidate wins a majority in a Senate race?', a: 'In some states a runoff is held. As per Al Jazeera, a Georgia Senate race without a majority winner goes to a runoff on 1 December.' },
      { q: 'How can the Senate result affect markets?', a: 'Investors follow control of the Senate for its bearing on taxes, spending, trade policy and appointments. The effect has differed from one election to another.' },
    ],
  },
  house: {
    id: 'house', path: `${b}/house`, tag: 'house', name: 'House',
    h1: 'US House Election 2026: Live Results and Updates',
    title: 'US House Election 2026: Live Results and Updates',
    description: 'Live results, projections and updates from the 2026 US House elections: which party will control the House of Representatives, race calls and key districts.',
    intro: 'All 435 seats of the House of Representatives are on the ballot in the midterm elections of 3 November 2026. This page carries the House updates, race calls and forecasts as they are reported.',
    faq: [
      { q: 'How many seats does a party need to control the House?', a: 'A party needs 218 of the 435 seats for a majority.' },
      { q: 'How many seats do Democrats need to win the House?', a: 'As per NBC News, Democrats need a net gain of 3 seats to flip the chamber, while Republicans are seeking to protect a narrow majority.' },
      { q: 'Why can House results take days?', a: 'Close races, mail ballots and recounts can delay a call, and some states count ballots more slowly than others.' },
      { q: 'How can the House result affect markets?', a: 'Control of the House shapes government spending and borrowing plans. Investors follow it alongside the Senate result.' },
    ],
  },
  governors: {
    id: 'governors', path: `${b}/governors`, tag: 'governor', name: 'Governors',
    h1: 'US Governor Elections 2026: Live Results and Updates',
    title: 'US Governor Elections 2026: Live Results and Updates',
    description: 'Live results and updates from the 2026 US governor elections across 36 states, with race calls as they are reported.',
    intro: 'Voters in 36 states are choosing governors in the midterm elections of 3 November 2026. This page carries the governor race updates and calls as they are reported.',
    faq: [
      { q: 'How many governor races are on the ballot in 2026?', a: 'Thirty-six states are electing governors, as per CBS News and Al Jazeera.' },
      { q: 'Why do governor races matter for investors?', a: 'State governments set taxes, budgets and regulations that affect local businesses, and some governors are seen as future national candidates.' },
    ],
  },
  markets: {
    id: 'markets', path: `${b}/markets`, tag: 'markets', name: 'Markets',
    h1: 'US Midterm Elections 2026: Market Impact for the US, Europe and India',
    title: 'US Midterm Elections 2026: Market Impact Live Updates',
    description: 'How the 2026 US midterm elections are affecting stocks, the dollar and Treasury yields in the US, and what it means for European and Indian markets.',
    intro: 'This page collects the updates on how the midterm elections are bearing on US stocks, the dollar and Treasury yields, and on markets in Europe and India, as reported by news publishers.',
    faq: [
      { q: 'How do midterm elections usually affect US stocks?', a: 'Markets mostly react to what an outcome may mean for taxes, government spending and borrowing. The effect has differed from one election to another.' },
      { q: 'What do the midterm elections mean for Indian markets?', a: 'Indian investors follow the outcome for its bearing on US trade policy, interest rates and the dollar, which influence foreign portfolio investor flows and the rupee.' },
      { q: 'What do the midterm elections mean for European markets?', a: 'European investors follow the outcome for its bearing on US trade policy, defence spending and interest rates.' },
    ],
  },
};

export const SECTION_IDS = Object.keys(SECTIONS) as SectionId[];
export const isSection = (s: string): s is SectionId => Object.hasOwn(SECTIONS, s);

export const sectionUpdates = (s: Section, all: ElectionUpdate[]) =>
  all.filter(u => (s.id === 'markets' ? u.tag === 'markets' || !!u.marketImpact : u.tag === s.tag));

// ---------- Races ----------
export type RaceKind = 'senate' | 'governor' | 'house';
export interface RaceInfo { slug: string; state: string; kind: RaceKind; district: number | null; name: string }

const RACE_RE = /^([a-z]+(?:-[a-z]+)*?)-(senate|governor|house)(?:-(\d{1,2}))?$/;
const title = (s: string) => s.split('-').map(w => (w === 'of' || w === 'and' ? w : w[0].toUpperCase() + w.slice(1))).join(' ');

export function parseRace(slug: string): RaceInfo | null {
  const m = slug.match(RACE_RE);
  if (!m || slug.length > 60) return null;
  const district = m[3] ? Number(m[3]) : null;
  const state = title(m[1]);
  const name = m[2] === 'house' ? `${state}${district ? ` District ${district}` : ''} House race` : m[2] === 'senate' ? `${state} Senate race` : `${state} governor race`;
  return { slug, state, kind: m[2] as RaceKind, district, name };
}

/** Cleans a race slug returned by the AI so the same race always gets the same URL. */
export function normaliseRace(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .replace(/-(us|u-s|united-states)-(senate|house)/, '-$2').replace(/-gubernatorial/, '-governor');
  return parseRace(s) ? s : null;
}

// Races that news publishers name as the ones to watch. These pages always exist (and stay out of
// search results until they have at least two updates).
export const KEY_RACES = ['georgia-senate', 'michigan-senate', 'maine-senate', 'north-carolina-senate', 'ohio-senate', 'iowa-senate', 'texas-senate', 'alaska-senate'];

export const MIN_UPDATES_TO_INDEX = 2;
export const racePath = (slug: string) => `${b}/races/${slug}`;
export const raceUpdates = (slug: string, all: ElectionUpdate[]) => all.filter(u => u.race === slug);

/** Races worth listing: the key races, plus any other race with at least two updates. */
export function listRaces(all: ElectionUpdate[]): { slug: string; name: string; count: number; latest: string | null }[] {
  const counts = new Map<string, { count: number; latest: string }>();
  for (const u of all) if (u.race) {
    const c = counts.get(u.race);
    counts.set(u.race, { count: (c?.count ?? 0) + 1, latest: c && c.latest > u.publishedAt ? c.latest : u.publishedAt });
  }
  const slugs = new Set([...KEY_RACES, ...[...counts].filter(([, v]) => v.count >= MIN_UPDATES_TO_INDEX).map(([k]) => k)]);
  return [...slugs].flatMap(slug => {
    const info = parseRace(slug);
    if (!info) return [];
    const c = counts.get(slug);
    return [{ slug, name: info.name, count: c?.count ?? 0, latest: c?.latest ?? null }];
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
