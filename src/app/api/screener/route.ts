import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SCREENER_STOCKS } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const filters = {
    sector: p.get('sector') ?? '',
    mcap_min: p.get('mcap_min') ? +p.get('mcap_min')! * 100 : null,
    mcap_max: p.get('mcap_max') ? +p.get('mcap_max')! * 100 : null,
    pe_min: p.get('pe_min') ? +p.get('pe_min')! : null,
    pe_max: p.get('pe_max') ? +p.get('pe_max')! : null,
    pb_min: p.get('pb_min') ? +p.get('pb_min')! : null,
    pb_max: p.get('pb_max') ? +p.get('pb_max')! : null,
    roe_min: p.get('roe_min') ? +p.get('roe_min')! : null,
    roe_max: p.get('roe_max') ? +p.get('roe_max')! : null,
    debt_equity_max: p.get('debt_equity_max') ? +p.get('debt_equity_max')! : null,
    rev_growth_1y_min: p.get('rev_growth_1y_min') ? +p.get('rev_growth_1y_min')! : null,
    profit_growth_1y_min: p.get('profit_growth_1y_min') ? +p.get('profit_growth_1y_min')! : null,
    div_yield_min: p.get('div_yield_min') ? +p.get('div_yield_min')! : null,
    promoter_min: p.get('promoter_min') ? +p.get('promoter_min')! : null,
    pledge_max: p.get('pledge_max') ? +p.get('pledge_max')! : null,
    sort_by: p.get('sort_by') ?? 'market_cap',
    sort_dir: p.get('sort_dir') === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, p.get('page') ? +p.get('page')! : 1),
    per_page: Math.min(100, Math.max(1, p.get('per_page') ? +p.get('per_page')! : 20)),
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

    return NextResponse.json({ data: data ?? [], total: count ?? 0 });
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
