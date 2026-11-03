// Public RSS feeds only. Edit this list to add or remove sources.
// Headlines, links and source names are stored; article text is never copied.
export interface Feed { name: string; url: string; /** true = every item is already election related */ targeted: boolean }

const gnews = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

export const FEEDS: Feed[] = [
  { name: 'Google News', url: gnews('US midterm elections results when:1d'), targeted: true },
  { name: 'Google News', url: gnews('Senate House control midterms when:1d'), targeted: true },
  { name: 'Google News', url: gnews('midterm elections markets Wall Street dollar Treasury yields when:1d'), targeted: true },
  { name: 'NPR', url: 'https://feeds.npr.org/1014/rss.xml', targeted: false },
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', targeted: false },
  { name: 'Politico', url: 'https://rss.politico.com/politics-news.xml', targeted: false },
  { name: 'The Hill', url: 'https://thehill.com/homenews/feed/', targeted: false },
  { name: 'The Guardian', url: 'https://www.theguardian.com/us-news/us-politics/rss', targeted: false },
];

// Items from untargeted feeds must look election related before any AI cost.
export const RELEVANCE_RE =
  /midterm|election|senate|house (?:race|seat|control|majority)|governor|congress|ballot|voters?|polls? (?:close|open|show)|gop|democrat|republican|swing state|projected|concede|runoff|redistrict|exit poll/i;

// Hard limits that keep the AI bill small.
export const MAX_ITEMS_PER_RUN = 30;
export const MAX_AI_CALLS_PER_DAY = 100;
export const MAX_ITEM_AGE_HOURS = 24;
export const MIN_IMPORTANCE_TO_PUBLISH = 3;
export const AI_MODEL = 'claude-haiku-5-5';

// Coverage stops by itself after this date (override with ELECTION_END_DATE).
export const DEFAULT_END_DATE = '2026-11-25';
