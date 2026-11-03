export type Tag = 'senate' | 'house' | 'governor' | 'markets' | 'other';
export type Region = 'US' | 'EU' | 'India';

export interface SourceLink { name: string; url: string }

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
