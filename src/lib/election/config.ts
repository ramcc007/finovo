// Public RSS feeds only. Edit this list to add or remove sources.
// Headlines, links and source names are stored; article text is never copied.
export interface Feed { name: string; url: string; /** true = every item is already election related */ targeted: boolean }

const gnews = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

export const FEEDS: Feed[] = [
  // Google News searches. "when:" keeps only recent stories. site: limits a search to one publisher,
  // which is how AP, Reuters and others are reached without their own feeds.
  { name: 'Google News', url: gnews('US midterm elections results when:2h'), targeted: true },
  { name: 'Google News', url: gnews('Senate control midterms projected when:2h'), targeted: true },
  { name: 'Google News', url: gnews('House control midterms projected when:2h'), targeted: true },
  { name: 'Google News', url: gnews('governor race called midterms when:2h'), targeted: true },
  { name: 'Google News', url: gnews('midterm elections markets Wall Street dollar Treasury yields when:6h'), targeted: true },
  { name: 'Google News', url: gnews('midterm elections turnout polls close when:2h'), targeted: true },
  { name: 'Google News: AP', url: gnews('midterm elections site:apnews.com when:6h'), targeted: true },
  { name: 'Google News: Reuters', url: gnews('midterm elections site:reuters.com when:6h'), targeted: true },
  { name: 'Google News: Bloomberg', url: gnews('midterm elections site:bloomberg.com when:6h'), targeted: true },
  { name: 'Google News: FT', url: gnews('midterm elections site:ft.com when:6h'), targeted: true },
  { name: 'Google News: CNBC', url: gnews('midterm elections site:cnbc.com when:6h'), targeted: true },
  // Publishers' own feeds (usually faster than Google News).
  { name: 'NPR', url: 'https://feeds.npr.org/1014/rss.xml', targeted: false },
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', targeted: false },
  { name: 'Politico', url: 'https://rss.politico.com/politics-news.xml', targeted: false },
  { name: 'The Hill', url: 'https://thehill.com/homenews/feed/', targeted: false },
  { name: 'The Guardian', url: 'https://www.theguardian.com/us-news/us-politics/rss', targeted: false },
  { name: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', targeted: false },
  { name: 'The Washington Post', url: 'https://feeds.washingtonpost.com/rss/politics', targeted: false },
  { name: 'CNN', url: 'http://rss.cnn.com/rss/cnn_allpolitics.rss', targeted: false },
  { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/politics', targeted: false },
  { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/politics', targeted: false },
  { name: 'ABC News', url: 'https://abcnews.go.com/abcnews/politicsheadlines', targeted: false },
  { name: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/us.xml', targeted: false },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', targeted: false },
  { name: 'France 24', url: 'https://www.france24.com/en/rss', targeted: false },
  { name: 'DW', url: 'https://rss.dw.com/rdf/rss-en-all', targeted: false },
  { name: 'CNBC', url: 'https://www.cnbc.com/id/10000113/device/rss/rss.html', targeted: false },
  { name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', targeted: false },
  { name: 'Axios', url: 'https://api.axios.com/feed/', targeted: false },
];

// Items from untargeted feeds must look election related before any AI cost.
export const RELEVANCE_RE =
  /midterm|election|senate|house (?:race|seat|control|majority)|governor|congress|ballot|voters?|polls? (?:close|open|show)|gop|democrat|republican|swing state|projected|concede|runoff|redistrict|exit poll/i;

// Hard limits that keep the AI bill small.
export const MAX_ITEMS_PER_RUN = 40;
export const MAX_AI_CALLS_PER_DAY = 200;
export const MAX_ITEM_AGE_HOURS = 24;
export const MIN_IMPORTANCE_TO_PUBLISH = 3;
export const AI_MODEL = 'claude-haiku-5-5';

// Coverage stops by itself after this date (override with ELECTION_END_DATE).
export const DEFAULT_END_DATE = '2026-11-25';

// Never credited: crypto outlets, brokers, trading apps and similar. Matched against the publisher name and domain.
export const BLOCKED_SOURCE_RE =
  /coin|crypto|bitcoin|blockchain|token|zerodha|groww|upstox|angel one|5paisa|robinhood|webull|moomoo|etoro|tipranks|seeking ?alpha|benzinga|stocktwits|substack|medium\.com|reddit/i;
