import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SCREENER_STOCKS } from '@/lib/mock-data';
import { computeScripwiseScore } from '@/lib/scripwiseScore';

// Parses a numeric query param, clamping to a sane finite range so that
// garbage/huge input (Infinity, NaN, absurd magnitudes) can't reach the DB query.
function num(raw: string | null, max = 1e9): number | null {
  if (!raw) return null;
  const n = +raw;
  if (!Number.isFinite(n)) return null;
  return Math.max(-max, Math.min(max, n));
}

interface ScreenerRow {
  symbol: string;
  sector: string | null;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  roce: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  revenue_growth_1y: number | null;
  profit_growth_1y: number | null;
  dividend_yield: number | null;
  pledge_pct: number | null;
  [key: string]: unknown;
}

// Same-sector P/E & P/B averages, computed from the full (unfiltered by
// screener criteria) universe — mirrors /api/stocks/[symbol]/score so a
// company's Scripwise Score means the same thing everywhere it's shown.
async function getSectorAverages(sectors: string[]): Promise<Map<string, { pe: number | null; pb: number | null }>> {
  const out = new Map<string, { pe: number | null; pb: number | null }>();
  if (!sectors.length) return out;
  const { data: peers } = await supabase
    .from('screener_view')
    .select('sector, pe, pb')
    .in('sector', sectors)
    .limit(5000);
  const bySector = new Map<string, { pes: number[]; pbs: number[] }>();
  for (const p of peers ?? []) {
    if (!p.sector) continue;
    const bucket = bySector.get(p.sector) ?? { pes: [], pbs: [] };
    if (p.pe != null && p.pe > 0) bucket.pes.push(p.pe);
    if (p.pb != null && p.pb > 0) bucket.pbs.push(p.pb);
    bySector.set(p.sector, bucket);
  }
  for (const [sector, { pes, pbs }] of bySector) {
    out.set(sector, {
      pe: pes.length >= 3 ? pes.reduce((a, b) => a + b, 0) / pes.length : null,
      pb: pbs.length >= 3 ? pbs.reduce((a, b) => a + b, 0) / pbs.length : null,
    });
  }
  return out;
}

function scoreRow(r: ScreenerRow, sectorAverages: Map<string, { pe: number | null; pb: number | null }>): number {
  const avg = (r.sector && sectorAverages.get(r.sector)) || { pe: null, pb: null };
  return computeScripwiseScore({
    pe: r.pe, pb: r.pb, roe: r.roe, roce: r.roce,
    debtToEquity: r.debt_to_equity, currentRatio: r.current_ratio,
    revenueGrowth1Y: r.revenue_growth_1y, profitGrowth1Y: r.profit_growth_1y,
    dividendYield: r.dividend_yield, pledgePct: r.pledge_pct,
    sectorAvgPe: avg.pe, sectorAvgPb: avg.pb,
  }).score;
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  // Optional explicit symbol list (used by Watchlist/Compare) — bypasses
  // pagination and other filters, just resolves these exact symbols.
  const symbolsParam = (p.get('symbols') ?? '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => /^[A-Z0-9&-]{1,20}$/.test(s))
    .slice(0, 20);

  const filters = {
    sector: (p.get('sector') ?? '').slice(0, 50),
    mcap_min: num(p.get('mcap_min')),
    mcap_max: num(p.get('mcap_max')),
    pe_min: num(p.get('pe_min')),
    pe_max: num(p.get('pe_max')),
    pb_min: num(p.get('pb_min')),
    pb_max: num(p.get('pb_max')),
    roe_min: num(p.get('roe_min')),
    roe_max: num(p.get('roe_max')),
    debt_equity_max: num(p.get('debt_equity_max')),
    rev_growth_1y_min: num(p.get('rev_growth_1y_min')),
    profit_growth_1y_min: num(p.get('profit_growth_1y_min')),
    div_yield_min: num(p.get('div_yield_min')),
    promoter_min: num(p.get('promoter_min')),
    pledge_max: num(p.get('pledge_max')),
    score_min: num(p.get('score_min'), 100),
    score_max: num(p.get('score_max'), 100),
    sort_by: p.get('sort_by') ?? 'market_cap',
    sort_dir: p.get('sort_dir') === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, Math.min(1e6, num(p.get('page')) ?? 1)),
    per_page: Math.min(100, Math.max(1, num(p.get('per_page')) ?? 20)),
  };

  const ALLOWED_SORT_COLS = new Set([
    'market_cap', 'mcap', 'pe', 'pb', 'roe', 'roce', 'price',
    'revenue_growth_1y', 'profit_growth_1y', 'dividend_yield',
    'debt_to_equity', 'promoter_pct', 'pledge_pct', 'name', 'symbol',
    'scripwise_score',
  ]);
  if (!ALLOWED_SORT_COLS.has(filters.sort_by)) {
    filters.sort_by = 'market_cap';
  }

  const needsScoring = filters.sort_by === 'scripwise_score' || filters.score_min != null || filters.score_max != null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyFilters = (q: any) => {
      let query = q;
      if (symbolsParam.length) query = query.in('symbol', symbolsParam);
      if (filters.sector) query = query.eq('sector', filters.sector);
      if (filters.mcap_min) query = query.gte('market_cap', filters.mcap_min);
      if (filters.mcap_max) query = query.lte('market_cap', filters.mcap_max);
      if (filters.pe_min) query = query.gte('pe', filters.pe_min);
      if (filters.pe_max) query = query.lte('pe', filters.pe_max);
      if (filters.pb_min) query = query.gte('pb', filters.pb_min);
      if (filters.pb_max) query = query.lte('pb', filters.pb_max);
      if (filters.roe_min) query = query.gte('roe', filters.roe_min);
      if (filters.roe_max) query = query.lte('roe', filters.roe_max);
      if (filters.debt_equity_max !== null) query = query.lte('debt_to_equity', filters.debt_equity_max);
      if (filters.rev_growth_1y_min) query = query.gte('revenue_growth_1y', filters.rev_growth_1y_min);
      if (filters.profit_growth_1y_min) query = query.gte('profit_growth_1y', filters.profit_growth_1y_min);
      if (filters.div_yield_min) query = query.gte('dividend_yield', filters.div_yield_min);
      if (filters.promoter_min) query = query.gte('promoter_pct', filters.promoter_min);
      if (filters.pledge_max !== null) query = query.lte('pledge_pct', filters.pledge_max);
      return query;
    };

    let rows: ScreenerRow[];
    let total: number;

    if (needsScoring) {
      // Score is derived, not a DB column — fetch every row matching the
      // non-score filters, compute scores in JS, then filter/sort/paginate
      // in memory. Bounded so a full-universe scan stays cheap.
      const query = applyFilters(supabase.from('screener_view').select('*')).limit(3000);
      const { data, error } = await query;
      if (error) throw error;
      rows = (data ?? []) as ScreenerRow[];

      const sectors = Array.from(new Set(rows.map(r => r.sector).filter((s): s is string => !!s)));
      const sectorAverages = await getSectorAverages(sectors);
      rows = rows.map(r => ({ ...r, scripwise_score: scoreRow(r, sectorAverages) }));

      if (filters.score_min != null) rows = rows.filter(r => (r.scripwise_score as number) >= filters.score_min!);
      if (filters.score_max != null) rows = rows.filter(r => (r.scripwise_score as number) <= filters.score_max!);

      rows.sort((a, b) => {
        const av = filters.sort_by === 'scripwise_score' ? (a.scripwise_score as number) : (a[filters.sort_by === 'mcap' ? 'market_cap' : filters.sort_by] as number ?? 0);
        const bv = filters.sort_by === 'scripwise_score' ? (b.scripwise_score as number) : (b[filters.sort_by === 'mcap' ? 'market_cap' : filters.sort_by] as number ?? 0);
        return filters.sort_dir === 'asc' ? av - bv : bv - av;
      });

      total = rows.length;
      const start = (filters.page - 1) * filters.per_page;
      rows = rows.slice(start, start + filters.per_page);
    } else {
      const sortCol = filters.sort_by === 'mcap' ? 'market_cap' : filters.sort_by;
      const query = applyFilters(supabase.from('screener_view').select('*', { count: 'exact' }))
        .order(sortCol, { ascending: filters.sort_dir === 'asc', nullsFirst: false })
        .range(
          (filters.page - 1) * filters.per_page,
          filters.page * filters.per_page - 1
        );

      const { data, error, count } = await query;
      if (error) throw error;
      rows = (data ?? []) as ScreenerRow[];
      total = count ?? 0;

      // Attach Scripwise Score for display using this page's sectors only —
      // cheap, and identical math to the full-scan path above.
      if (rows.length) {
        const sectors = Array.from(new Set(rows.map(r => r.sector).filter((s): s is string => !!s)));
        const sectorAverages = await getSectorAverages(sectors);
        rows = rows.map(r => ({ ...r, scripwise_score: scoreRow(r, sectorAverages) }));
      }
    }

    // screener_view.price comes from the *weekly* ratios ingestion and can be
    // several days stale. Overlay the daily EOD quote (best-effort) so the
    // table shows the latest close and day-change like the rest of the app.
    if (rows.length) {
      const { data: quotes } = await supabase
        .from('quotes')
        .select('symbol, price, change_pct')
        .in('symbol', rows.map(r => r.symbol));
      if (quotes?.length) {
        const qmap = new Map(quotes.map(q => [q.symbol, q]));
        rows = rows.map(r => {
          const q = qmap.get(r.symbol);
          return q
            ? { ...r, price: q.price ?? r.price, change_pct: q.change_pct ?? r.change_pct }
            : r;
        });
      }
    }

    return NextResponse.json({ data: rows, total });
  } catch {
    // Fallback: filter mock data
    let results = [...SCREENER_STOCKS];
    if (symbolsParam.length) results = results.filter(s => symbolsParam.includes(s.symbol));
    if (filters.sector) results = results.filter(s => s.sector === filters.sector);
    if (filters.pe_min) results = results.filter(s => s.pe >= filters.pe_min!);
    if (filters.pe_max) results = results.filter(s => s.pe <= filters.pe_max!);
    if (filters.roe_min) results = results.filter(s => s.roe >= filters.roe_min!);
    if (filters.debt_equity_max !== null) results = results.filter(s => s.debtEquity <= filters.debt_equity_max!);

    const sortKey = filters.sort_by === 'market_cap' ? 'mcap' : filters.sort_by as keyof typeof results[0];
    results.sort((a, b) => {
      const aVal = a[sortKey] as number ?? 0;
      const bVal = b[sortKey] as number ?? 0;
      return filters.sort_dir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    const start = (filters.page - 1) * filters.per_page;
    const paged = results.slice(start, start + filters.per_page).map(s => ({
      symbol: s.symbol, name: s.name, sector: s.sector,
      pe: s.pe, pb: s.pb, roe: s.roe, roce: s.roce,
      market_cap: s.mcap, debt_to_equity: s.debtEquity,
      revenue_growth_1y: s.revGrowth1Y, profit_growth_1y: s.profGrowth1Y,
      dividend_yield: s.divYield, promoter_pct: s.promoter, pledge_pct: 0,
      price: s.price,
    }));

    return NextResponse.json({ data: paged, total: results.length });
  }
}
