import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SCREENER_STOCKS } from '@/lib/mock-data';

// Parses a numeric query param, clamping to a sane finite range so that
// garbage/huge input (Infinity, NaN, absurd magnitudes) can't reach the DB query.
function num(raw: string | null, max = 1e9): number | null {
  if (!raw) return null;
  const n = +raw;
  if (!Number.isFinite(n)) return null;
  return Math.max(-max, Math.min(max, n));
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

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
    sort_by: p.get('sort_by') ?? 'market_cap',
    sort_dir: p.get('sort_dir') === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, Math.min(1e6, num(p.get('page')) ?? 1)),
    per_page: Math.min(100, Math.max(1, num(p.get('per_page')) ?? 20)),
  };

  const ALLOWED_SORT_COLS = new Set([
    'market_cap', 'mcap', 'pe', 'pb', 'roe', 'roce', 'price',
    'revenue_growth_1y', 'profit_growth_1y', 'dividend_yield',
    'debt_to_equity', 'promoter_pct', 'pledge_pct', 'name', 'symbol',
  ]);
  if (!ALLOWED_SORT_COLS.has(filters.sort_by)) {
    filters.sort_by = 'market_cap';
  }

  try {
    let query = supabase
      .from('screener_view')
      .select('*', { count: 'exact' });

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

    const sortCol = filters.sort_by === 'mcap' ? 'market_cap' : filters.sort_by;
    query = query
      .order(sortCol, { ascending: filters.sort_dir === 'asc', nullsFirst: false })
      .range(
        (filters.page - 1) * filters.per_page,
        filters.page * filters.per_page - 1
      );

    const { data, error, count } = await query;
    if (error) throw error;

    // screener_view.price comes from the *weekly* ratios ingestion and can be
    // several days stale. Overlay the daily EOD quote (best-effort) so the
    // table shows the latest close and day-change like the rest of the app.
    let rows = data ?? [];
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

    return NextResponse.json({ data: rows, total: count ?? 0 });
  } catch {
    // Fallback: filter mock data
    let results = [...SCREENER_STOCKS];
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
