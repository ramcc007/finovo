import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getServiceClient } from '@/lib/supabaseServer';
import { resolveRaces, type RaceReport, type RaceResult } from './raceMap';
import type { ElectionMeta, ElectionUpdate, FeedStat, LiveVideo, Media, Projection, Region, Scoreboard, SourceLink, Tag } from './types';

export const ELECTION_TAG = 'election-updates';

export interface UpdateRow {
  id: string; cluster_key: string; headline: string; summary: string; market_impact: string | null;
  market_regions: string[] | null; tag: string; importance: number; sources: unknown; media: Media | null; race: string | null;
  published_at: string; hidden: boolean;
}
export const UPDATE_COLS = 'id, cluster_key, headline, summary, market_impact, market_regions, tag, importance, sources, media, race, published_at, hidden';

export function toUpdate(r: UpdateRow): ElectionUpdate {
  return {
    id: r.id, clusterKey: r.cluster_key, headline: r.headline, summary: r.summary,
    marketImpact: r.market_impact, marketRegions: (r.market_regions ?? []) as Region[],
    tag: r.tag as Tag, importance: r.importance,
    sources: (Array.isArray(r.sources) ? r.sources : []) as SourceLink[],
    media: r.media ?? null, race: r.race ?? null, publishedAt: r.published_at, hidden: r.hidden,
  };
}

interface MetaRow {
  scoreboard: Scoreboard; pending_scoreboard: Scoreboard; takeaways: string[]; videos: LiveVideo[] | null; feed_stats: FeedStat[] | null; projections: Projection[] | null; race_overrides: ElectionMeta['raceOverrides'] | null; auto_publish: boolean; coverage_ended: boolean;
  ended_at: string | null; started_at: string; last_ingest_at: string | null; last_error: string | null;
  llm_calls_today: number; items_today: number;
}
export const META_COLS = 'scoreboard, pending_scoreboard, takeaways, videos, feed_stats, projections, race_overrides, auto_publish, coverage_ended, ended_at, started_at, last_ingest_at, last_error, llm_calls_today, items_today';

export function toMeta(r: MetaRow): ElectionMeta {
  return {
    scoreboard: r.scoreboard ?? {}, pendingScoreboard: r.pending_scoreboard ?? {},
    takeaways: Array.isArray(r.takeaways) ? r.takeaways : [], videos: Array.isArray(r.videos) ? r.videos : [], feedStats: Array.isArray(r.feed_stats) ? r.feed_stats : [], projections: Array.isArray(r.projections) ? r.projections : [], raceOverrides: r.race_overrides && typeof r.race_overrides === 'object' ? r.race_overrides : {}, autoPublish: r.auto_publish !== false, coverageEnded: r.coverage_ended,
    endedAt: r.ended_at, startedAt: r.started_at, lastIngestAt: r.last_ingest_at, lastError: r.last_error,
    llmCallsToday: r.llm_calls_today, itemsToday: r.items_today,
  };
}

const loadUpdates = unstable_cache(
  async (): Promise<ElectionUpdate[]> => {
    const { data } = await getServiceClient()
      .from('election_updates').select(UPDATE_COLS).eq('hidden', false)
      .order('published_at', { ascending: false }).limit(1000);
    return ((data ?? []) as UpdateRow[]).map(toUpdate);
  },
  ['election-updates-v3'], { tags: [ELECTION_TAG], revalidate: 300 },
);

const loadMeta = unstable_cache(
  async (): Promise<ElectionMeta | null> => {
    const { data } = await getServiceClient().from('election_meta').select(META_COLS).eq('id', 1).maybeSingle();
    return data ? toMeta(data as MetaRow) : null;
  },
  ['election-meta-v5'], { tags: [ELECTION_TAG], revalidate: 300 },
);

const loadReports = unstable_cache(
  async (): Promise<RaceReport[]> => {
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const { data } = await getServiceClient().from('election_race_reports')
      .select('chamber, state, source_name, party, status, url, reported_at').gte('reported_at', since).limit(2000);
    return (data ?? []).map(r => ({
      chamber: r.chamber, state: String(r.state).trim(), source: r.source_name, party: r.party, status: r.status, url: r.url, at: r.reported_at,
    })) as RaceReport[];
  },
  ['election-race-reports-v1'], { tags: [ELECTION_TAG], revalidate: 300 },
);

export const getUpdates = cache(loadUpdates);
export const getMeta = cache(loadMeta);
export const getRaceReports = cache(async (): Promise<RaceReport[]> => { try { return await loadReports(); } catch { return []; } });

/** What the live map shows: reports from top outlets plus any admin overrides, resolved. Plain array so it can cross to a client component. */
export async function getRaceResults(meta: ElectionMeta | null): Promise<RaceResult[]> {
  return [...resolveRaces(await getRaceReports(), meta?.raceOverrides ?? {}).values()];
}

/** Public view: only when the tables exist and respond. Never throws. */
export async function getElectionData(): Promise<{ updates: ElectionUpdate[]; meta: ElectionMeta | null }> {
  try {
    const [updates, meta] = await Promise.all([getUpdates(), getMeta()]);
    return { updates, meta };
  } catch {
    return { updates: [], meta: null };
  }
}
