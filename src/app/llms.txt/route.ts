import { getPublishedPosts } from '@/lib/blogDb';
import { getPublishedTerms } from '@/lib/glossaryDb';

const base = 'https://www.scripwise.co.in';

const HEADER = `# Scripwise

> Scripwise is a free Indian stock research and screening platform covering NSE & BSE listed companies. It provides financial ratios, P&L/balance sheet/cash-flow data, shareholding patterns, corporate actions, and the Scripwise Score — a transparent, rule-based 0–100 read on a company's fundamentals (no external AI/API calls, purely deterministic).

Scripwise is not a SEBI-registered investment adviser. All data is for informational and educational purposes only and does not constitute investment advice.

## Product

- [Homepage](${base}/): Search, hero market snapshot, and product overview.
- [Explorer](${base}/screener): Free, no-login stock screener — filter 5,000+ NSE & BSE companies by valuation, growth, profitability, and Scripwise Score. Supports CSV export and quick-filter presets.
- [Markets](${base}/markets): Market overview — top gainers/losers, most active, 52-week highs/lows, sector performance, and sector heatmap. Requires a free account.
- [Pre-built Screens](${base}/screens): Ready-made screens for quality, value, income, momentum, and turnaround investing frameworks. Requires a free account.
- [Compare](${base}/compare): Side-by-side comparison of up to 4 companies across 14 fundamental metrics. Requires a free account.
- [Watchlist](${base}/watchlist): Personal tracked-stocks list with CSV export. Requires a free account.

## Account

- [Sign up](${base}/signup): Free account creation — name, email, investor profile (Beginner through Institutional), optional city.
- [Log in](${base}/login): Existing-user sign-in, reachable from the signup page's tab switcher.

## Blog

- [Blog](${base}/blog): Plain-language Indian stock market articles (FPI flows, SIPs, index funds, screening). RSS: ${base}/blog/feed.xml, JSON Feed: ${base}/blog/feed.json

## Live coverage

- [US Midterm Elections 2026: Live Updates and Results](${base}/us-midterm-elections): A running timeline of the 3 November 2026 US midterm elections for readers in the US, Europe and India, with seat counts, plain-language updates checked every 10 minutes, market-impact notes and a credited source on every update. Feeds: ${base}/us-midterm-elections/feed.xml (RSS), ${base}/us-midterm-elections/feed.json (JSON Feed). Plain-text version: ${base}/us-midterm-elections/index.md

## Glossary

- [Glossary](${base}/glossary): Indian stock market and investing terms explained in plain words, A to Z.

## Legal

- [Disclaimer](${base}/disclaimer)
- [Privacy Policy](${base}/privacy)
- [Terms of Use](${base}/terms)

## Notes for automated agents

- The Explorer (\`/screener\`) is the only research tool that does not require authentication; Markets, Screens, Compare, and Watchlist require a free Scripwise account.
- Data is NSE/BSE end-of-day; treat it as informational, not real-time trading data or investment advice.
- \`/api/*\` routes are internal application endpoints, not a public API, and are disallowed in robots.txt.
`;

export async function GET() {
  let body = HEADER;

  const posts = await getPublishedPosts();
  if (posts.length > 0) {
    body = body.replace('## Legal', `### Latest articles\n\n${posts.map(p => `- [${p.title}](${base}/blog/${p.slug}): ${p.metaDescription || p.excerpt}`).join('\n')}\n\n## Legal`);
  }

  const terms = await getPublishedTerms();
  if (terms.length > 0) {
    body = body.replace('## Legal', `### Glossary terms\n\n${terms.map(t => `- [${t.term}](${base}/glossary/${t.slug}): ${t.definition}`).join('\n')}\n\n## Legal`);
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
