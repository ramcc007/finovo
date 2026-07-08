import { supabase } from '@/lib/supabase';

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
- [Corporate Actions Calendar](${base}/calendar): Dividends, bonuses, splits, rights, buybacks, and board/AGM/EGM meeting dates. Requires a free account.
- [Watchlist](${base}/watchlist): Personal tracked-stocks list with CSV export. Requires a free account.

## Account

- [Sign up](${base}/signup): Free account creation — name, email, investor profile (Beginner through Institutional), optional city.
- [Log in](${base}/login): Existing-user sign-in, reachable from the signup page's tab switcher.

## Legal

- [Disclaimer](${base}/disclaimer)
- [Privacy Policy](${base}/privacy)
- [Terms of Use](${base}/terms)

## Notes for automated agents

- The Explorer (\`/screener\`) is the only research tool that does not require authentication; Markets, Screens, Compare, Calendar, and Watchlist require a free Scripwise account.
- Data is NSE/BSE end-of-day; treat it as informational, not real-time trading data or investment advice.
- \`/api/*\` routes are internal application endpoints, not a public API, and are disallowed in robots.txt.

## Stocks

Every listed company has a research page at \`/stocks/{SYMBOL}\` with company profile, live quote, financial ratios, Scripwise Score with history, and multi-year financial statements.
`;

export async function GET() {
  let body = HEADER;

  try {
    const { data } = await supabase
      .from('companies')
      .select('symbol, name')
      .eq('is_active', true)
      .order('symbol');

    if (data && data.length > 0) {
      const lines = data.map(c => `- [${c.symbol} — ${c.name}](${base}/stocks/${c.symbol})`);
      body += '\n' + lines.join('\n') + '\n';
    }
  } catch {
    // DB unreachable — ship the header-only version rather than fail the route.
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
