export type Tag = 'senate' | 'house' | 'governor' | 'markets' | 'other';
export type Region = 'US' | 'EU' | 'India';

export interface SourceLink { name: string; url: string }

/** Optional picture or video on an update. Media is never hosted by Scripwise: images load from a
 *  free-licence host and videos from YouTube's own player, and every item carries a credit. */
export interface Media {
  type: 'image' | 'video';
  url: string; // image URL, or the YouTube link for a video
  videoId?: string;
  credit: string;
  creditUrl?: string;
  alt?: string;
}

/** A video in the "Watch live" strip. */
export interface LiveVideo { kind: 'video' | 'live'; id: string; title: string; credit: string }

export interface ElectionUpdate {
  id: string;
  clusterKey: string;
  headline: string;
  summary: string;
  marketImpact: string | null;
  marketRegions: Region[];
  tag: Tag;
  importance: number;
  sources: SourceLink[];
  media: Media | null;
  publishedAt: string;
  hidden: boolean;
}

export interface Tally { d: number | null; r: number | null; other: number | null; uncalled: number | null }
export type Chamber = 'senate' | 'house' | 'governors';
export interface ScoreEntry extends Tally { source?: string; updatedAt?: string }
export type Scoreboard = Partial<Record<Chamber, ScoreEntry>>;

export interface ElectionMeta {
  scoreboard: Scoreboard;
  pendingScoreboard: Scoreboard;
  takeaways: string[];
  videos: LiveVideo[];
  coverageEnded: boolean;
  endedAt: string | null;
  startedAt: string;
  lastIngestAt: string | null;
  lastError: string | null;
  llmCallsToday: number;
  itemsToday: number;
}

export const PAGE_PATH = '/us-midterm-elections';
export const TAG_LABEL: Record<Tag, string> = { senate: 'Senate', house: 'House', governor: 'Governors', markets: 'Markets', other: 'Other' };

/** Stable in-page anchor for one update (used by links, feeds and structured data). */
export const anchorOf = (id: string) => `u-${id.slice(0, 8)}`;
