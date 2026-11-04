import { revalidateTag } from 'next/cache';
import { getServiceClient } from '@/lib/supabaseServer';
import { isGovUrl } from '@/lib/blogSanitize';
import { pingIndexNow, pingWebSub } from '@/lib/indexNow';
import {
  AI_MODEL, DEFAULT_END_DATE, FEEDS, MAX_AI_CALLS_PER_DAY, MAX_ITEMS_PER_RUN, MAX_ITEM_AGE_HOURS,
  MIN_IMPORTANCE_TO_PUBLISH, RELEVANCE_RE, TOP_SOURCE_RE, CHAMBER_MAX,
} from './config';
import { ELECTION_TAG, META_COLS, toMeta } from './db';
import { fetchFeed, jaccard, titleNorm, titleTokens, urlHash, type RawItem } from './rss';
import { SYSTEM_PROMPT, USER_RULES, cleanText, hasBanned } from './style';
import { normaliseRace } from './sections';
import { isRaceState, type CallStatus, type MapChamber, type Party } from './raceMap';
import { PAGE_PATH, type Chamber, type Projection, type ScoreEntry, type Scoreboard, type SourceLink, type Tag } from './types';

const TAGS: Tag[] = ['senate', 'house', 'governor', 'markets', 'other'];
const CHAMBERS: Chamber[] = ['senate', 'house', 'governors'];
const REGIONS = ['US', 'EU', 'India'];

interface Group { id: string; items: RawItem[] }
interface AiItem {
  id: string; importance: number; tag: string; headline: string; summary: string; cluster_key: string;
  market_impact: string | null; market_regions: string[]; seats: { chamber: string; d: number; r: number; other: number | null; uncalled: number | null } | null;
  projection: { chamber: string; kind: string; party: string | null; probability: number | null; by: string } | null;
  race?: string | null;
  race_call?: { chamber: string; state: string; party: string; status: string } | null;
}

export interface IngestResult {
  ok: boolean; skipped?: string; fetched?: number; fresh?: number; sent?: number; published?: number; merged?: number; feeds?: string; error?: string;
}

async function callClaude(system: string, user: string, maxTokens: number, timeoutMs = 40_000): Promise<{ text: string; stop: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    // Extended thinking is switched off: this is a simple rewrite job, and thinking was using up the
    // whole output budget and leaving no text (stop_reason max_tokens, 0 characters).
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, thinking: { type: 'disabled' }, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`AI request failed (${r.status})`);
  const d = await r.json() as { content?: { type: string; text?: string }[]; stop_reason?: string };
  return { text: (d.content ?? []).filter(c => c.type === 'text').map(c => c.text ?? '').join(''), stop: d.stop_reason ?? '' };
}

/** Escapes stray double quotes inside JSON strings (a quote only closes a string if a , } ] or : follows). */
function repairJson(raw: string): string {
  let out = '';
  let inStr = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '\\' && inStr) { out += c + (raw[i + 1] ?? ''); i++; continue; }
    if (c === '"') {
      if (!inStr) { inStr = true; out += c; continue; }
      const next = raw.slice(i + 1).match(/^\s*(.)/)?.[1];
      if (next === undefined || ',}]:'.includes(next)) { inStr = false; out += c; } else out += '\\"';
      continue;
    }
    out += c === '\n' && inStr ? ' ' : c;
  }
  return out;
}

function parseJson<T>(text: string): T {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
  const body = text.slice(start, end + 1);
  try { return JSON.parse(body) as T; } catch { return JSON.parse(repairJson(body)) as T; }
}

/** Finds every top-level {...} in a text, ignoring braces inside strings. */
function topLevelObjects(text: string): string[] {
  const out: string[] = [];
  let depth = 0, start = -1, inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}' && depth > 0) { depth--; if (depth === 0 && start >= 0) { out.push(text.slice(start, i + 1)); start = -1; } }
  }
  return out;
}

const asItems = (v: unknown): AiItem[] | null => {
  if (Array.isArray(v)) return v as AiItem[];
  if (v && typeof v === 'object') for (const x of Object.values(v)) if (Array.isArray(x)) return x as AiItem[];
  return null;
};

/** Parses the AI's reply, whatever shape it comes in: a clean array, an object holding an array, or loose objects. */
function parseItems(text: string): { items: AiItem[]; bad: number; snippet: string; complete: boolean } {
  try {
    const whole = asItems(parseJson<unknown>(text));
    if (whole) return { items: whole, bad: 0, snippet: '', complete: true };
  } catch { /* fall through to per-item parsing */ }
  const items: AiItem[] = [];
  let bad = 0, snippet = '';
  for (const obj of topLevelObjects(repairJson(text))) {
    try {
      const o = JSON.parse(obj) as AiItem;
      if (o && typeof o === 'object' && typeof o.id === 'string') items.push(o);
    } catch (e) { bad++; if (!snippet) snippet = `${e instanceof Error ? e.message : ''} | ${obj.slice(0, 160)}`; }
  }
  return { items, bad, snippet, complete: false };
}

const CALL_WORDS = /\b(wins?|won|defeats?|beats?|elected|re-?elected|projected|projects|declared|called|flips?|holds?|leads?|leading|ahead|clinch\w*)\b/i;

/** Reads the Senate or governor call out of updates saved before call extraction existed (or that the model skipped),
 *  one batch per run, newest first. Each credited top outlet becomes a report for the live map. Returns the AI calls used. */
async function backfillCalls(db: ReturnType<typeof getServiceClient>, timeoutMs: number): Promise<number> {
  const since = new Date(Date.now() - 72 * 3_600_000).toISOString();
  const { data } = await db.from('election_updates').select('id, headline, summary, race, sources, published_at')
    .eq('calls_checked', false).eq('hidden', false).gte('published_at', since).order('published_at', { ascending: false }).limit(60);
  const rows = (data ?? []) as { id: string; headline: string; summary: string; race: string | null; sources: SourceLink[]; published_at: string }[];
  // Only items that look like a single Senate or governor result are worth a model call; the rest are marked done.
  const worth = rows.filter(r => /-(senate|governor)$/.test(r.race ?? '') && CALL_WORDS.test(r.headline)).slice(0, 25);
  const skip = rows.filter(r => !worth.includes(r)).map(r => r.id);
  if (skip.length) await db.from('election_updates').update({ calls_checked: true }).in('id', skip);
  if (worth.length === 0) return 0;

  const input = worth.map(r => ({ id: r.id, race: r.race, headline: r.headline, summary: r.summary }));
  const system = 'You read US election headlines and return only JSON. Never guess and never use outside knowledge.';
  const user = `For each item, say whether the text reports that a news organisation has called, projected or declared the winner of that Senate or governor race, or says a candidate is leading it with votes counted. Return a JSON array of {"id":"<id>","race_call":null | {"chamber":"senate"|"governor","state":"two-letter postal code","party":"D"|"R"|"I","status":"called"|"leading"}}. Use "called" only when the text says called, projected, won, defeated, elected or declared; otherwise "leading". Use null when the text does not state a result.\n${JSON.stringify(input)}`;
  try {
    const { text } = await callClaude(system, user, 2500, timeoutMs);
    const out = parseJson<{ id: string; race_call: AiItem['race_call'] }[]>(text);
    for (const o of out) {
      const row = worth.find(r => r.id === o.id);
      const rc = o.race_call;
      const chamber = rc?.chamber === 'senate' || rc?.chamber === 'governor' ? (rc.chamber as MapChamber) : null;
      const state = String(rc?.state ?? '').toUpperCase();
      if (!row || !rc || !chamber || !isRaceState(chamber, state) || !['D', 'R', 'I'].includes(rc.party) || (rc.status !== 'called' && rc.status !== 'leading')) continue;
      for (const src of Array.isArray(row.sources) ? row.sources : []) {
        if (!TOP_SOURCE_RE.test(src.name) || isGovUrl(src.url)) continue;
        const { data: prev } = await db.from('election_race_reports').select('reported_at').eq('chamber', chamber).eq('state', state).eq('source_name', src.name).maybeSingle();
        if (prev && Date.parse(prev.reported_at as string) > Date.parse(row.published_at)) continue;
        await db.from('election_race_reports').upsert({
          chamber, state, source_name: src.name.slice(0, 60), party: rc.party as Party, status: rc.status as CallStatus, url: src.url, reported_at: row.published_at,
        }, { onConflict: 'chamber,state,source_name' });
      }
    }
    await db.from('election_updates').update({ calls_checked: true }).in('id', worth.map(r => r.id));
  } catch { /* leave them unchecked; the next run tries again */ }
  return 1;
}

const int = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1000 ? v : null);

export async function runIngest(): Promise<IngestResult> {
  const t0 = Date.now();
  const left = () => 52_000 - (Date.now() - t0); // the function is limited to 60 s
  const db = getServiceClient();
  const { data: metaRow } = await db.from('election_meta').select(`${META_COLS}, llm_day, last_indexnow_at`).eq('id', 1).maybeSingle();
  if (!metaRow) return { ok: false, error: 'election_meta row missing' };
  const meta = toMeta(metaRow as never);

  const endDate = new Date(`${process.env.ELECTION_END_DATE || DEFAULT_END_DATE}T23:59:59Z`).getTime();
  if (meta.coverageEnded) return { ok: true, skipped: 'coverage ended' };
  if (Date.now() > endDate) return { ok: true, skipped: 'past the end date' };

  const today = new Date().toISOString().slice(0, 10);
  const sameDay = (metaRow as { llm_day: string | null }).llm_day === today;
  let calls = sameDay ? meta.llmCallsToday : 0;
  let itemsToday = sameDay ? meta.itemsToday : 0;
  let feedStats: { name: string; status: string; total: number; relevant: number }[] = [];
  const finish = async (patch: Record<string, unknown>) => {
    await db.from('election_meta').update({ last_ingest_at: new Date().toISOString(), llm_day: today, llm_calls_today: calls, items_today: itemsToday, feed_stats: feedStats, ...patch }).eq('id', 1);
  };

  // If this run is killed by the time limit, this note is what the admin page shows.
  await db.from('election_meta').update({ last_ingest_at: new Date().toISOString(), last_error: 'The last run did not finish (it may have timed out).' }).eq('id', 1);

  // 0. Catch up on race calls hidden in updates saved earlier (one small AI call per run, only while there is a backlog)
  if (calls < MAX_AI_CALLS_PER_DAY && left() > 30_000) calls += await backfillCalls(db, Math.min(20_000, left() - 25_000));

  // 1. Collect
  const results = await Promise.all(FEEDS.map(async f => {
    const r = await fetchFeed(f);
    const items = r.items.filter(i => f.targeted || RELEVANCE_RE.test(`${i.title} ${i.snippet}`));
    return { name: f.name, status: r.status, total: r.items.length, relevant: items.length, items };
  }));
  feedStats = results.map(({ name, status, total, relevant }) => ({ name, status, total, relevant }));
  const fetched = results.flatMap(r => r.items);
  const cutoff = Date.now() - MAX_ITEM_AGE_HOURS * 3_600_000;
  const recentItems = fetched.filter(i => Date.parse(i.publishedAt) >= cutoff);

  // 2. Drop what was already seen (exact link), then near-duplicate headlines. No AI involved.
  const hashes = [...new Set(recentItems.map(i => urlHash(i.url)))];
  const { data: seenRows } = await db.from('election_seen_items').select('url_hash').in('url_hash', hashes.slice(0, 500));
  const seen = new Set((seenRows ?? []).map(r => r.url_hash as string));
  const { data: titleRows } = await db.from('election_seen_items').select('title_norm')
    .gte('seen_at', new Date(Date.now() - 48 * 3_600_000).toISOString()).limit(1500);
  const knownTokens = (titleRows ?? []).map(r => (r.title_norm as string).split(' '));

  const groups: Group[] = [];
  const dupSeen: { hash: string; title: string }[] = [];
  for (const item of recentItems.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))) {
    const h = urlHash(item.url);
    if (seen.has(h)) continue;
    seen.add(h);
    const tokens = titleTokens(item.title);
    if (tokens.length < 3) continue;
    if (knownTokens.some(k => jaccard(tokens, k) >= 0.6)) { dupSeen.push({ hash: h, title: item.title }); continue; }
    const same = groups.find(g => jaccard(tokens, titleTokens(g.items[0].title)) >= 0.6);
    if (same) { same.items.push(item); continue; }
    groups.push({ id: `i${groups.length}`, items: [item] });
  }
  const batch = groups.slice(0, MAX_ITEMS_PER_RUN);
  const markSeen = async (list: { hash: string; title: string }[]) => {
    if (list.length === 0) return;
    await db.from('election_seen_items').upsert(list.map(x => ({ url_hash: x.hash, title_norm: titleNorm(x.title) })), { onConflict: 'url_hash' });
  };
  await markSeen(dupSeen);

  if (batch.length === 0) { await finish({ last_error: null }); return { ok: true, fetched: fetched.length, fresh: 0, sent: 0, published: 0 }; }
  if (calls >= MAX_AI_CALLS_PER_DAY) { await finish({ last_error: 'Daily AI call limit reached; waiting for tomorrow.' }); return { ok: false, error: 'daily AI cap' }; }

  // 3. Ask the model in small batches, in parallel, so the whole run stays well inside the time limit.
  const { data: recentRows } = await db.from('election_updates').select('cluster_key, headline').order('published_at', { ascending: false }).limit(15);
  const recentJson = JSON.stringify(recentRows ?? []);
  const ask = async (slice: Group[]) => {
    calls++;
    const prompt = `${USER_RULES}\n\nrecent: ${recentJson}\n\nitems: ${JSON.stringify(slice.map(g => ({
      id: g.id, source: g.items[0].source, published: g.items[0].publishedAt, title: g.items[0].title, snippet: g.items[0].snippet,
    })))}`;
    const { text, stop } = await callClaude(SYSTEM_PROMPT, prompt, 5000, Math.max(8_000, Math.min(38_000, left() - 8_000)));
    const parsed = parseItems(text);
    const peek = `stop=${stop || '?'}, ${text.length} chars, starts: ${text.slice(0, 120).replace(/\s+/g, ' ')} ... ends: ${text.slice(-80).replace(/\s+/g, ' ')}`;
    return { ...parsed, peek };
  };
  const askChunk = async (slice: Group[]) => {
    try {
      let r = await ask(slice);
      if (r.items.length === 0 && !r.complete && left() > 25_000 && calls < MAX_AI_CALLS_PER_DAY) r = await ask(slice); // one retry
      return { slice, ...r, error: null as string | null };
    } catch (e) {
      return { slice, items: [] as AiItem[], bad: 0, snippet: '', complete: false, peek: '', error: e instanceof Error ? e.message : 'AI error' };
    }
  };
  const CHUNK = 14;
  const chunks: Group[][] = [];
  for (let i = 0; i < batch.length; i += CHUNK) chunks.push(batch.slice(i, i + CHUNK));
  const answers = await Promise.all(chunks.map(askChunk));

  const completeIds = new Set<string>(); // items in a readable reply that the model left out were judged not worth publishing
  const ai: AiItem[] = [];
  let parseNote: string | null = null;
  const failures: string[] = [];
  for (const r of answers) {
    ai.push(...r.items);
    if (r.complete) r.slice.forEach(g => completeIds.add(g.id));
    if (r.error) failures.push(r.error);
    else if (r.items.length === 0 && !r.complete) failures.push(`AI reply could not be read. ${r.peek}`);
    else if (r.bad) parseNote = `${r.bad} item(s) in the AI reply could not be read and will be retried. ${r.snippet}`.slice(0, 400);
  }
  if (ai.length === 0 && completeIds.size === 0) {
    const msg = (failures[0] ?? 'AI reply could not be read.').slice(0, 500);
    await finish({ last_error: `AI step failed: ${msg}` }); // items stay unseen and are retried next run
    return { ok: false, error: msg };
  }
  if (failures.length && !parseNote) parseNote = `${failures.length} of ${answers.length} AI batches failed and will be retried. ${failures[0]}`.slice(0, 500);

  // 4. Save
  const byId = new Map(ai.map(a => [a.id, a]));
  const toSeen: { hash: string; title: string }[] = [];
  const created: { id: string; importance: number }[] = [];
  let merged = 0;
  let sawFive = false;
  const pending: Scoreboard = { ...meta.pendingScoreboard };
  const board: Scoreboard = { ...meta.scoreboard };
  const projections: Projection[] = [...meta.projections];
  let boardChanged = false, projectionsChanged = false;
  // Race calls for the live map: one stored report per (race, outlet). Loaded once, only if a call turns up.
  let knownReports: Map<string, string> | null = null; // "chamber:state:outlet" -> reported_at
  let callsChanged = false;

  for (const g of batch) {
    const a = byId.get(g.id);
    // A readable reply that leaves an item out means the model chose not to use it: remember it.
    // A partly unreadable reply leaves the item unseen so the next run retries it.
    if (!a && !completeIds.has(g.id)) continue;
    for (const it of g.items) toSeen.push({ hash: urlHash(it.url), title: it.title });
    if (!a) continue;
    const importance = Math.min(5, Math.max(1, Math.round(Number(a.importance) || 1)));
    if (importance < MIN_IMPORTANCE_TO_PUBLISH) continue;
    const headline = cleanText(String(a.headline ?? '')).slice(0, 160);
    const summary = cleanText(String(a.summary ?? '')).slice(0, 600);
    if (!headline || !summary || hasBanned(`${headline} ${summary}`)) continue;

    const sources: SourceLink[] = [];
    for (const it of g.items) {
      if (isGovUrl(it.url) || sources.some(s => s.url === it.url || s.name === it.source)) continue;
      sources.push({ name: it.source.slice(0, 60), url: it.url });
      if (sources.length >= 4) break;
    }
    if (sources.length === 0) continue; // never publish without a credited source

    const tag = (TAGS.includes(a.tag as Tag) ? a.tag : 'other') as Tag;
    const clusterKey = String(a.cluster_key || `${tag}-${g.id}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 60);
    const impact = importance >= 4 && a.market_impact ? cleanText(String(a.market_impact)).slice(0, 280) : null;
    const regions = impact ? (a.market_regions ?? []).filter(r => REGIONS.includes(r)) : [];

    // Same story as a recent update: add the source instead of a new entry.
    const { data: existing } = await db.from('election_updates').select('id, sources, importance')
      .eq('cluster_key', clusterKey).gte('published_at', new Date(Date.now() - 48 * 3_600_000).toISOString()).limit(1).maybeSingle();
    if (existing) {
      const have = (existing.sources as SourceLink[]) ?? [];
      const add = sources.filter(s => !have.some(h => h.name === s.name));
      if (add.length && have.length < 5) {
        await db.from('election_updates').update({ sources: [...have, ...add].slice(0, 5), updated_at: new Date().toISOString() }).eq('id', existing.id);
        merged++;
      }
    } else {
      const published = new Date(Math.min(Date.parse(g.items[0].publishedAt), Date.now())).toISOString();
      const { data: row } = await db.from('election_updates').insert({
        cluster_key: clusterKey, headline, summary, market_impact: impact, market_regions: regions, tag, importance, sources, race: normaliseRace(a.race), published_at: published, calls_checked: true,
      }).select('id').single();
      if (row) { created.push({ id: row.id as string, importance }); if (importance === 5) sawFive = true; itemsToday++; }
    }

    // Seat counts and projections from top outlets are applied automatically, after sanity checks.
    const top = TOP_SOURCE_RE.test(sources[0].name);
    const at = new Date(Math.min(Date.parse(g.items[0].publishedAt), Date.now())).toISOString();
    const st = a.seats;
    if (top && st && CHAMBERS.includes(st.chamber as Chamber) && int(st.d) !== null && int(st.r) !== null) {
      const c = st.chamber as Chamber;
      const entry: ScoreEntry = { d: int(st.d), r: int(st.r), other: int(st.other), uncalled: int(st.uncalled), source: sources[0].name, updatedAt: at };
      const prev = board[c];
      const called = (entry.d ?? 0) + (entry.r ?? 0) + (entry.other ?? 0);
      const prevCalled = prev ? (prev.d ?? 0) + (prev.r ?? 0) + (prev.other ?? 0) : -1;
      const inRange = called <= CHAMBER_MAX[c] && (entry.uncalled ?? 0) <= CHAMBER_MAX[c];
      const newer = !prev?.updatedAt || Date.parse(at) >= Date.parse(prev.updatedAt);
      if (inRange && called >= prevCalled && newer) {
        if (meta.autoPublish) board[c] = entry; else pending[c] = entry;
        boardChanged = true;
      } else if (!inRange) {
        pending[c] = entry; // implausible numbers wait for a person to look at them
      }
    }
    const pj = a.projection;
    if (top && pj && CHAMBERS.includes(pj.chamber as Chamber) && (pj.kind === 'called' || pj.kind === 'forecast') && (pj.party === 'D' || pj.party === 'R')) {
      const prob = typeof pj.probability === 'number' && pj.probability >= 0 && pj.probability <= 100 ? Math.round(pj.probability) : null;
      if (pj.kind === 'called' || prob !== null) {
        const p: Projection = {
          chamber: pj.chamber as Chamber, kind: pj.kind, party: pj.party, probability: pj.kind === 'forecast' ? prob : null,
          by: cleanText(String(pj.by || sources[0].name)).slice(0, 60), source: sources[0].name, url: sources[0].url, at,
        };
        const k = (x: Projection) => `${x.chamber}|${x.kind}|${x.by.toLowerCase()}`;
        const idx = projections.findIndex(x => k(x) === k(p));
        if (idx === -1) { projections.push(p); projectionsChanged = true; }
        else if (Date.parse(p.at) >= Date.parse(projections[idx].at)) { projections[idx] = p; projectionsChanged = true; }
      }
    }

    // A single Senate or governor race called, or led, by a top outlet. Each credited top outlet becomes one report;
    // the map only turns a state solid when two different outlets agree (see raceMap.ts).
    const rc = a.race_call;
    const rcChamber = rc?.chamber === 'senate' || rc?.chamber === 'governor' ? (rc.chamber as MapChamber) : null;
    const rcState = String(rc?.state ?? '').toUpperCase();
    if (rc && rcChamber && isRaceState(rcChamber, rcState) && ['D', 'R', 'I'].includes(rc.party) && (rc.status === 'called' || rc.status === 'leading')) {
      if (!knownReports) {
        const { data } = await db.from('election_race_reports').select('chamber, state, source_name, reported_at');
        knownReports = new Map((data ?? []).map(r => [`${r.chamber}:${String(r.state).trim()}:${r.source_name}`, r.reported_at as string]));
      }
      for (const src of sources) {
        if (!TOP_SOURCE_RE.test(src.name)) continue;
        const key = `${rcChamber}:${rcState}:${src.name}`;
        const prev = knownReports.get(key);
        if (prev && Date.parse(prev) > Date.parse(at)) continue; // a newer report from this outlet is already stored
        const { error } = await db.from('election_race_reports').upsert({
          chamber: rcChamber, state: rcState, source_name: src.name, party: rc.party as Party, status: rc.status as CallStatus,
          url: src.url, reported_at: at,
        }, { onConflict: 'chamber,state,source_name' });
        if (!error) { knownReports.set(key, at); callsChanged = true; }
      }
    }
  }
  await markSeen(toSeen);

  // 5. Fresh takeaways, only when something of top importance arrived
  let takeaways: string[] | undefined;
  if (sawFive && calls < MAX_AI_CALLS_PER_DAY && left() > 16_000) {
    try {
      const { data: top } = await db.from('election_updates').select('headline, summary').eq('hidden', false).order('published_at', { ascending: false }).limit(12);
      calls++;
      const { text: txt } = await callClaude(
        SYSTEM_PROMPT,
        `Using only these updates, write 3 to 5 plain sentences describing where the election stands right now. Each sentence is one string. Do not use bullet characters. Return only a JSON array of strings.\n${JSON.stringify(top ?? [])}`,
        700, Math.max(6_000, Math.min(20_000, left() - 8_000)),
      );
      const arr = parseJson<string[]>(txt).map(x => cleanText(String(x))).filter(x => x && !hasBanned(x)).slice(0, 5);
      if (arr.length >= 3) takeaways = arr;
    } catch { /* keep the old takeaways */ }
  }

  const patch: Record<string, unknown> = { last_error: parseNote };
  if (takeaways) patch.takeaways = takeaways;
  if (boardChanged) patch.scoreboard = board;
  if (projectionsChanged) {
    const cutoff = Date.now() - 72 * 3_600_000;
    patch.projections = projections.filter(x => Date.parse(x.at) >= cutoff).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  }
  if (JSON.stringify(pending) !== JSON.stringify(meta.pendingScoreboard)) patch.pending_scoreboard = pending;
  await finish(patch);

  revalidateTag(ELECTION_TAG, { expire: 0 }); // keeps the "Checked" time on the page accurate
  if (created.length || merged || takeaways || boardChanged || projectionsChanged || callsChanged) {
    await pingWebSub([`${PAGE_PATH}/feed.xml`, `${PAGE_PATH}/feed.json`]);
    const last = (metaRow as { last_indexnow_at: string | null }).last_indexnow_at;
    if (created.length > 0 && (!last || Date.now() - Date.parse(last) > 600_000)) {
      await db.from('election_meta').update({ last_indexnow_at: new Date().toISOString() }).eq('id', 1);
      await pingIndexNow([PAGE_PATH, `${PAGE_PATH}/feed.xml`, '/sitemap.xml']);
    }
  }
  return { ok: true, fetched: fetched.length, fresh: groups.length, sent: batch.length, published: created.length, merged, feeds: `${feedStats.filter(f => f.status === 'ok').length}/${feedStats.length} ok` };
}
