// Ratios the data feed leaves empty, worked out from the annual financials we already store.
// Money columns in `fundamentals` and `ratios.market_cap` are both in crores of rupees.

export interface AnnualRow {
  period: string; // "2026-03"
  revenue: number | null; ebitda: number | null; net_profit: number | null; eps: number | null;
  total_assets: number | null; total_equity: number | null; total_debt: number | null; cash: number | null;
  operating_cashflow: number | null; free_cashflow: number | null;
}

export interface Derived {
  /** Financial year the numbers come from, e.g. "FY26" */
  fy: string | null;
  eps: number | null;
  ev: number | null;
  ev_ebitda: number | null;
  roe: number | null;
  net_margin: number | null;
  ebitda_margin: number | null;
  asset_turnover: number | null;
  fcf_yield: number | null;
  cash_conversion: number | null;
  revenue_cagr_3y: number | null;
  profit_cagr_3y: number | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v)) ? Number(v) : null));
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** "2026-03" -> "FY26" (Indian financial years end in March). */
export function fyLabel(period: string): string | null {
  const m = period.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]);
  return `FY${String(month >= 4 ? year + 1 : year).slice(-2)}`;
}

function cagr(latest: number | null, earlier: number | null, years: number): number | null {
  if (latest == null || earlier == null || latest <= 0 || earlier <= 0) return null; // growth of a loss or from a loss is not meaningful
  return round((Math.pow(latest / earlier, 1 / years) - 1) * 100, 1);
}

export function computeDerived(rowsIn: AnnualRow[], marketCap: number | null): Derived {
  const rows = rowsIn
    .map(r => ({ ...r, revenue: num(r.revenue), ebitda: num(r.ebitda), net_profit: num(r.net_profit), eps: num(r.eps), total_assets: num(r.total_assets), total_equity: num(r.total_equity), total_debt: num(r.total_debt), cash: num(r.cash), operating_cashflow: num(r.operating_cashflow), free_cashflow: num(r.free_cashflow) }))
    .filter(r => r.revenue != null || r.net_profit != null)
    .sort((a, b) => b.period.localeCompare(a.period));
  const cur = rows[0];
  const empty: Derived = { fy: null, eps: null, ev: null, ev_ebitda: null, roe: null, net_margin: null, ebitda_margin: null, asset_turnover: null, fcf_yield: null, cash_conversion: null, revenue_cagr_3y: null, profit_cagr_3y: null };
  if (!cur) return empty;

  const prev = rows[1];
  const mcap = marketCap != null && marketCap > 0 ? marketCap : null;
  const ev = mcap != null && cur.total_debt != null && cur.cash != null ? round(mcap + cur.total_debt - cur.cash, 0) : null;

  // ROE on the average of opening and closing equity when both exist, else closing equity.
  const eq = cur.total_equity != null && prev?.total_equity != null ? (cur.total_equity + prev.total_equity) / 2 : cur.total_equity;
  const three = rows.find(r => r.period === shiftYears(cur.period, -3));

  return {
    fy: fyLabel(cur.period),
    eps: cur.eps,
    ev,
    ev_ebitda: ev != null && cur.ebitda != null && cur.ebitda > 0 ? round(ev / cur.ebitda, 1) : null,
    roe: cur.net_profit != null && eq != null && eq > 0 ? round((cur.net_profit / eq) * 100, 1) : null,
    net_margin: cur.net_profit != null && cur.revenue != null && cur.revenue > 0 ? round((cur.net_profit / cur.revenue) * 100, 1) : null,
    ebitda_margin: cur.ebitda != null && cur.revenue != null && cur.revenue > 0 ? round((cur.ebitda / cur.revenue) * 100, 1) : null,
    asset_turnover: cur.revenue != null && cur.total_assets != null && cur.total_assets > 0 ? round(cur.revenue / cur.total_assets, 2) : null,
    fcf_yield: mcap != null && cur.free_cashflow != null ? round((cur.free_cashflow / mcap) * 100, 1) : null,
    cash_conversion: cur.operating_cashflow != null && cur.net_profit != null && cur.net_profit > 0 ? round(cur.operating_cashflow / cur.net_profit, 2) : null,
    revenue_cagr_3y: cagr(cur.revenue, three?.revenue ?? null, 3),
    profit_cagr_3y: cagr(cur.net_profit, three?.net_profit ?? null, 3),
  };
}

function shiftYears(period: string, years: number): string {
  const m = period.match(/^(\d{4})-(\d{2})/);
  return m ? `${Number(m[1]) + years}-${m[2]}` : '';
}
