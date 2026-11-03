import { revalidateTag } from 'next/cache';
import { getServiceClient } from '@/lib/supabase';
import { isGovUrl } from '@/lib/blogSanitize';
import { pingIndexNow, pingWebSub } from '@/lib/indexNow';
import {
  AI_MODEL, DEFAULT_END_DATE, FEEDS, MAX_AI_CALLS_PER_DAY, MAX_ITEMS_PER_RUN, MAX_ITEM_AGE_HOURS,
  MIN_IMPORTANCE_TO_PUBLISH, RELEVANCE_RE,
} from './config';
import { ELECTION_TAG, META_COLS, toMeta } from './db';
import { fetchFeed, jaccard, titleNorm, titleTokens, urlHash, type RawItem } from './rss';
import { SYSTEM_PROMPT, USER_RULES, cleanText, hasBanned } from './style';
import { PAGE_PATH, type Chamber, type Scoreboard, type SourceLink, type Tag } from './types';

const TAGS: Tag[] = ['senate', 'house', 'governor', 'markets', 'other'];
const CHAMBERS: Chamber[] = ['senate', 'house', 'governors'];
const REGIONS = ['US', 'EU', 'India'];

interface Group { id: string; items: RawItem[] }
interface AiItem {
  id: string; importance: number; tag: string; headline: string; summary: string; cluster_key: string;
  market_impact: string | null; market_regions: string[]; seats: { chamber: string; d: number; r: number; other: number | null; uncalled: number | null } | null;
}

export interface IngestResult {
  ok: boolean; skipped?: string; fetched?: number; fresh?: number; sent?: number; published?: number; merged?: number; error?: string;
}

async function callClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!r.ok) throw new Error(`AI request failed (${r.status})`);
  const d = await r.json() as { content?: { type: string; text?: string }[] };
  return (d.content ?? []).filter(c => c.type === 'text').map(c => c.text ?? '').join('');
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

const int = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1000 ? v : null);

export async function runIngest(): Promise<IngestResult> {
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
  const finish = async (patch: Record<string, unknown>) => {
    await db.from('election_meta').update({ last_ingest_at: new Date().toISOString(), llm_day: today, llm_calls_today: calls, items_today: itemsToday, ...patch }).eq('id', 1);
  };

  // 1. Collect
  const fetched = (await Promise.all(FEEDS.map(async f => (await fetchFeed(f)).filter(i => f.targeted || RELEVANCE_RE.test(`${i.title} ${i.snippet}`))))).flat();
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

  // 3. One AI call for the whole batch
  const { data: recentRows } = await db.from('election_updates').select('cluster_key, headline').order('published_at', { ascending: false }).limit(15);
  const prompt = `${USER_RULES}\n\nrecent: ${JSON.stringify(recentRows ?? [])}\n\nitems: ${JSON.stringify(batch.map(g => ({
    id: g.id, source: g.items[0].source, published: g.items[0].publishedAt, title: g.items[0].title, snippet: g.items[0].snippet,
  })))}`;
  let ai: AiItem[];
  try {
    calls++;
    ai = parseJson<AiItem[]>(await callClaude(SYSTEM_PROMPT, prompt, 4000));
    if (!Array.isArray(ai)) throw new Error('AI reply was not a list');
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI error';
    await finish({ last_error: `AI step failed: ${msg}` }); // items stay unseen and are retried next run
    return { ok: false, error: msg };
  }

  // 4. Save
  const byId = new Map(ai.map(a => [a.id, a]));
  const toSeen: { hash: string; title: string }[] = [];
  const created: { id: string; importance: number }[] = [];
  let merged = 0;
  let sawFive = false;
  const pending: Scoreboard = {};

  for (const g of batch) {
    for (const it of g.items) toSeen.push({ hash: urlHash(it.url), title: it.title });
    const a = byId.get(g.id);
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
        cluster_key: clusterKey, headline, summary, market_impact: impact, market_regions: regions, tag, importance, sources, published_at: published,
      }).select('id').single();
      if (row) { created.push({ id: row.id as string, importance }); if (importance === 5) sawFive = true; itemsToday++; }
    }

    const s = a.seats;
    if (s && CHAMBERS.includes(s.chamber as Chamber) && int(s.d) !== null && int(s.r) !== null) {
      pending[s.chamber as Chamber] = {
        d: int(s.d), r: int(s.r), other: int(s.other), uncalled: int(s.uncalled),
        source: sources[0].name, updatedAt: new Date().toISOString(),
      };
    }
  }
  await markSeen(toSeen);

  // 5. Fresh takeaways, only when something of top importance arrived
  let takeaways: string[] | undefined;
  if (sawFive && calls < MAX_AI_CALLS_PER_DAY) {
    try {
      const { data: top } = await db.from('election_updates').select('headline, summary').eq('hidden', false).order('published_at', { ascending: false }).limit(12);
      calls++;
      const txt = await callClaude(
        SYSTEM_PROMPT,
        `Using only these updates, write 3 to 5 plain sentences describing where the election stands right now. Each sentence is one string. Do not use bullet characters. Return only a JSON array of strings.\n${JSON.stringify(top ?? [])}`,
        700,
      );
      const arr = parseJson<string[]>(txt).map(x => cleanText(String(x))).filter(x => x && !hasBanned(x)).slice(0, 5);
      if (arr.length >= 3) takeaways = arr;
    } catch { /* keep the old takeaways */ }
  }

  const patch: Record<string, unknown> = { last_error: null };
  if (takeaways) patch.takeaways = takeaways;
  if (Object.keys(pending).length) patch.pending_scoreboard = { ...meta.pendingScoreboard, ...pending };
  await finish(patch);

  if (created.length || merged || takeaways) {
    revalidateTag(ELECTION_TAG, { expire: 0 });
    await pingWebSub([`${PAGE_PATH}/feed.xml`, `${PAGE_PATH}/feed.json`]);
    const last = (metaRow as { last_indexnow_at: string | null }).last_indexnow_at;
    if (created.some(c => c.importance >= 4) && (!last || Date.now() - Date.parse(last) > 3_600_000)) {
      await db.from('election_meta').update({ last_indexnow_at: new Date().toISOString() }).eq('id', 1);
      await pingIndexNow([PAGE_PATH, `${PAGE_PATH}/feed.xml`, '/sitemap.xml']);
    }
  }
  return { ok: true, fetched: fetched.length, fresh: groups.length, sent: batch.length, published: created.length, merged };
}
