// Works out what the live map shows. Deliberately self-contained (types only) so it can be tested alone.

export type MapChamber = 'senate' | 'governor';
export type Party = 'D' | 'R' | 'I';
export type CallStatus = 'called' | 'leading';

export interface RaceReport { chamber: MapChamber; state: string; source: string; party: Party; status: CallStatus; url: string; at: string }
export interface RaceOverride { party: Party | null; status: CallStatus | 'none' }
export type Overrides = Record<string, RaceOverride>;

export interface RaceResult {
  chamber: MapChamber;
  state: string;
  /** 'called' = solid colour; 'leading' = light colour (reported by one outlet, or only "leading"); 'none' = nothing to show */
  status: CallStatus | 'none';
  party: Party | null;
  sources: { name: string; url: string; at: string; status: CallStatus; party: Party }[];
  conflict: boolean; // outlets disagree: nothing is shown until an admin or more reports settle it
  overridden: boolean;
}

// The 2026 races (35 Senate seats: 33 regular plus special elections in Florida and Ohio; 36 governors).
export const SENATE_STATES = ['AL', 'AK', 'AR', 'CO', 'DE', 'FL', 'GA', 'ID', 'IL', 'IA', 'KS', 'KY', 'LA', 'ME', 'MA', 'MI', 'MN', 'MS', 'MT', 'NE', 'NH', 'NJ', 'NM', 'NC', 'OH', 'OK', 'OR', 'RI', 'SC', 'SD', 'TN', 'TX', 'VA', 'WV', 'WY'];
export const GOVERNOR_STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'FL', 'GA', 'HI', 'ID', 'IL', 'IA', 'KS', 'ME', 'MD', 'MA', 'MI', 'MN', 'NE', 'NV', 'NH', 'NM', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'VT', 'WI', 'WY'];
export const RACE_STATES: Record<MapChamber, string[]> = { senate: SENATE_STATES, governor: GOVERNOR_STATES };
export const MIN_OUTLETS_TO_CALL = 2;

export const raceKey = (chamber: MapChamber, state: string) => `${chamber}:${state}`;
export const isRaceState = (chamber: MapChamber, state: string) => RACE_STATES[chamber].includes(state);

// One outlet must never count twice ("AP", "The AP", "Associated Press" are the same outlet).
const OUTLET_ALIASES: [RegExp, string][] = [
  [/\b(ap|associated press)\b/i, 'ap'], [/reuters/i, 'reuters'], [/\bnpr\b/i, 'npr'], [/\bbbc\b/i, 'bbc'], [/\bcnn\b/i, 'cnn'],
  [/\bnbc\b/i, 'nbc'], [/\bcbs\b/i, 'cbs'], [/\babc\b/i, 'abc'], [/\bpbs\b/i, 'pbs'], [/politico/i, 'politico'], [/the hill/i, 'thehill'],
  [/guardian/i, 'guardian'], [/new york times|\bnyt\b/i, 'nyt'], [/washington post/i, 'wapo'], [/bloomberg/i, 'bloomberg'],
  [/financial times|\bft\b/i, 'ft'], [/cnbc/i, 'cnbc'], [/wall street journal|\bwsj\b/i, 'wsj'], [/axios/i, 'axios'], [/sky news/i, 'sky'],
  [/al jazeera/i, 'aljazeera'], [/\bdw\b/i, 'dw'], [/france 24/i, 'france24'], [/marketwatch/i, 'marketwatch'], [/decision desk/i, 'ddhq'],
];
const norm = (s: string) => OUTLET_ALIASES.find(([re]) => re.test(s))?.[1] ?? s.toLowerCase().replace(/[^a-z]/g, '');

/** Resolves every race that has reports or an override. Anything not returned has nothing to show. */
export function resolveRaces(reports: RaceReport[], overrides: Overrides = {}): Map<string, RaceResult> {
  const byRace = new Map<string, RaceReport[]>();
  for (const r of reports) {
    if (!isRaceState(r.chamber, r.state)) continue;
    const k = raceKey(r.chamber, r.state);
    byRace.set(k, [...(byRace.get(k) ?? []), r]);
  }
  const out = new Map<string, RaceResult>();

  for (const [k, list] of byRace) {
    const [chamber, state] = k.split(':') as [MapChamber, string];
    const sources = list.map(r => ({ name: r.source, url: r.url, at: r.at, status: r.status, party: r.party })).sort((a, b) => b.at.localeCompare(a.at));
    const calledBy = new Map<Party, Set<string>>();
    for (const r of list) if (r.status === 'called') calledBy.set(r.party, (calledBy.get(r.party) ?? new Set()).add(norm(r.source)));
    const parties = new Set(list.map(r => r.party));

    let status: RaceResult['status'] = 'none';
    let party: Party | null = null;
    let conflict = false;

    if (calledBy.size > 1) {
      conflict = true; // outlets have called it for different parties
    } else if (calledBy.size === 1) {
      const [[p, outlets]] = [...calledBy];
      party = p;
      status = outlets.size >= MIN_OUTLETS_TO_CALL ? 'called' : 'leading'; // one outlet only: shown light until a second agrees
      if (parties.size > 1) { conflict = true; status = 'none'; party = null; } // someone says leading for the other party
    } else if (parties.size === 1) {
      party = [...parties][0]; status = 'leading';
    } else {
      conflict = true;
    }
    out.set(k, { chamber, state, status, party, sources, conflict, overridden: false });
  }

  for (const [k, o] of Object.entries(overrides)) {
    const [chamber, state] = k.split(':') as [MapChamber, string];
    if (!isRaceState(chamber, state)) continue;
    const base = out.get(k);
    out.set(k, { chamber, state, status: o.status, party: o.status === 'none' ? null : o.party, sources: base?.sources ?? [], conflict: false, overridden: true });
  }
  return out;
}

export interface Tally { d: number; r: number; i: number; leadingD: number; leadingR: number; leadingI: number; total: number; undecided: number }

/** Counts for the bar above the map. Only solid (called) races count towards the headline numbers. */
export function tally(chamber: MapChamber, results: Map<string, RaceResult>): Tally {
  const t: Tally = { d: 0, r: 0, i: 0, leadingD: 0, leadingR: 0, leadingI: 0, total: RACE_STATES[chamber].length, undecided: 0 };
  for (const state of RACE_STATES[chamber]) {
    const r = results.get(raceKey(chamber, state));
    if (r?.status === 'called' && r.party) { if (r.party === 'D') t.d++; else if (r.party === 'R') t.r++; else t.i++; }
    else if (r?.status === 'leading' && r.party) { if (r.party === 'D') t.leadingD++; else if (r.party === 'R') t.leadingR++; else t.leadingI++; }
  }
  t.undecided = t.total - t.d - t.r - t.i;
  return t;
}
