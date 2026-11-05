// Where one company sits among the other companies in its sector. Pure functions.

export interface PeerRow { symbol: string; pe: number | null; pb: number | null; roe: number | null; net_margin: number | null; debt_to_equity: number | null; revenue_growth_1y: number | null; dividend_yield: number | null }

export interface PeerMetric {
  key: string; label: string; unit: string;
  value: number; median: number;
  /** Share of the other companies (0 to 100) whose value is lower than this company's. */
  percentile: number;
  total: number; // companies with a value for this metric, this one included
}

const METRICS: { key: keyof PeerRow; label: string; unit: string; positiveOnly?: boolean }[] = [
  { key: 'pe', label: 'P/E ratio', unit: 'x', positiveOnly: true },
  { key: 'pb', label: 'P/B ratio', unit: 'x', positiveOnly: true },
  { key: 'roe', label: 'Return on equity', unit: '%' },
  { key: 'net_margin', label: 'Net profit margin', unit: '%' },
  { key: 'revenue_growth_1y', label: 'Revenue growth (1Y)', unit: '%' },
  { key: 'debt_to_equity', label: 'Debt to equity', unit: 'x' },
  { key: 'dividend_yield', label: 'Dividend yield', unit: '%' },
];

const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v !== '' && isFinite(Number(v)) ? Number(v) : null);
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

export function computePeerStats(rows: PeerRow[], symbol: string): PeerMetric[] {
  const me = rows.find(r => r.symbol === symbol);
  if (!me) return [];
  const out: PeerMetric[] = [];
  for (const m of METRICS) {
    const mine = num(me[m.key]);
    if (mine == null || (m.positiveOnly && mine <= 0)) continue;
    const all = rows.map(r => num(r[m.key])).filter((v): v is number => v != null && (!m.positiveOnly || v > 0));
    if (all.length < 5) continue; // too few peers to say anything
    const others = rows.filter(r => r.symbol !== symbol).map(r => num(r[m.key])).filter((v): v is number => v != null && (!m.positiveOnly || v > 0));
    const sorted = [...all].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    out.push({
      key: String(m.key), label: m.label, unit: m.unit,
      value: round(mine, 2), median: round(median, 2),
      percentile: others.length ? Math.round((others.filter(v => v < mine).length / others.length) * 100) : 50,
      total: all.length,
    });
  }
  return out;
}
