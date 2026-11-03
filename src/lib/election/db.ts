import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getServiceClient } from '@/lib/supabaseServer';
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
  scoreboard: Scoreboard; pending_scoreboard: Scoreboard; takeaways: string[]; videos: LiveVideo[] | null; feed_stats: FeedStat[] | null; projections: Projection[] | null; auto_publish: boolean; coverage_ended: boolean;
  ended_at: string | null; started_at: string; last_ingest_at: string | null; last_error: string | null;
  llm_calls_today: number; items_today: number;
}
export const META_COLS = 'scoreboard, pending_scoreboard, takeaways, videos, feed_stats, projections, auto_publish, coverage_ended, ended_at, started_at, last_ingest_at, last_error, llm_calls_today, items_today';

export function toMeta(r: MetaRow): ElectionMeta {
  return {
    scoreboard: r.scoreboard ?? {}, pendingScoreboard: r.pending_scoreboard ?? {},
    takeaways: Array.isArray(r.takeaways) ? r.takeaways : [], videos: Array.isArray(r.videos) ? r.videos : [], feedStats: Array.isArray(r.feed_stats) ? r.feed_stats : [], projections: Array.isArray(r.projections) ? r.projections : [], autoPublish: r.auto_publish !== false, coverageEnded: r.coverage_ended,
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
  ['election-meta-v4'], { tags: [ELECTION_TAG], revalidate: 300 },
);

export const getUpdates = cache(loadUpdates);
export const getMeta = cache(loadMeta);

/** Public view: only when the tables exist and respond. Never throws. */
export async function getElectionData(): Promise<{ updates: ElectionUpdate[]; meta: ElectionMeta | null }> {
  try {
    const [updates, meta] = await Promise.all([getUpdates(), getMeta()]);
    return { updates, meta };
  } catch {
    return { updates: [], meta: null };
  }
}
