'use client';

import { cn, formatTradeDate } from '@/lib/utils';

type Row = Record<string, unknown>;
const n = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v !== '' && isFinite(Number(v)) ? Number(v) : null);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-06" -> { fiscal: "Q1 FY27", ended: "Jun 2026" } (Indian financial year runs April to March). */
function quarterName(period: string): { fiscal: string; ended: string } | null {
  const m = period.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]);
  const q = Math.floor(((month - 4 + 12) % 12) / 3) + 1;
  const fy = month >= 4 ? year + 1 : year;
  return { fiscal: `Q${q} FY${String(fy).slice(-2)}`, ended: `${MONTHS[month - 1]} ${year}` };
}
const yearBefore = (period: string) => { const m = period.match(/^(\d{4})-(\d{2})/); return m ? `${Number(m[1]) - 1}-${m[2]}` : ''; };
const change = (cur: number | null, prev: number | null) => (cur == null || prev == null || prev <= 0 ? null : ((cur - prev) / prev) * 100);
const fmtCr = (v: number | null) => (v == null ? '—' : `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`);

function Delta({ label, v }: { label: string; v: number | null }) {
  return (
    <span className="text-[11px] text-[#8A96A8]">
      {label}{' '}
      <span className={cn('num font-semibold', v == null ? 'text-[#8A96A8]' : v >= 0 ? 'text-positive' : 'text-negative')}>
        {v == null ? 'n/a' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`}
      </span>
    </span>
  );
}

function Bars({ values, labels, tone }: { values: (number | null)[]; labels: string[]; tone: 'rev' | 'profit' }) {
  const max = Math.max(1, ...values.map(v => Math.abs(v ?? 0)));
  return (
    <div role="img" aria-label={labels.map((l, i) => `${l}: ${values[i] ?? 'no data'}`).join(', ')}>
      <div className="flex h-16 items-end gap-1.5">
        {values.map((v, i) => (
          <div key={labels[i]} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${labels[i]}: ${fmtCr(v)}`}>
            <div className={cn('w-full rounded-sm', v == null ? 'bg-[#EEF1F7]' : tone === 'rev' ? 'bg-[#C7D2FE]' : v >= 0 ? 'bg-[#86EFAC]' : 'bg-[#FCA5A5]')} style={{ height: `${v == null ? 6 : Math.max(6, (Math.abs(v) / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5" aria-hidden>
        {labels.map(l => <span key={l} className="min-w-0 flex-1 truncate text-center text-[9px] text-[#8A96A8]">{l.replace(' FY', ' ')}</span>)}
      </div>
    </div>
  );
}

/** Latest quarter against the same quarter a year ago and the quarter before, with the last few quarters as bars. */
export default function QuarterlyCard({ quarterly, nextEarnings }: { quarterly: Row[]; nextEarnings?: string | null }) {
  const rows = quarterly
    .map(r => ({ period: String(r.period ?? ''), revenue: n(r.revenue), ebitda: n(r.ebitda), profit: n(r.net_profit) }))
    .filter(r => /^\d{4}-\d{2}/.test(r.period) && (r.revenue != null || r.profit != null))
    .sort((a, b) => b.period.localeCompare(a.period));
  if (rows.length === 0) return null;

  const cur = rows[0];
  const name = quarterName(cur.period);
  const prevQ = rows[1] ?? null;
  const yoy = rows.find(r => r.period === yearBefore(cur.period)) ?? null;
  const series = rows.slice(0, 6).reverse();
  const labels = series.map(r => quarterName(r.period)?.fiscal ?? r.period);

  return (
    <section className="card p-5" aria-labelledby="qr-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="qr-h" className="text-xs font-semibold uppercase tracking-wide text-[#4A5568]">Latest quarterly results</h3>
        {name && <span className="text-[11px] text-[#8A96A8]">{name.fiscal} · quarter ended {name.ended}</span>}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8A96A8]">Revenue</div>
          <div className="num mt-1 text-xl font-bold text-[#0D1117]">{fmtCr(cur.revenue)}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3"><Delta label="vs last year" v={change(cur.revenue, yoy?.revenue ?? null)} /><Delta label="vs last quarter" v={change(cur.revenue, prevQ?.revenue ?? null)} /></div>
          <div className="mt-3"><Bars values={series.map(r => r.revenue)} labels={labels} tone="rev" /></div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8A96A8]">Net profit</div>
          <div className="num mt-1 text-xl font-bold text-[#0D1117]">{fmtCr(cur.profit)}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3"><Delta label="vs last year" v={change(cur.profit, yoy?.profit ?? null)} /><Delta label="vs last quarter" v={change(cur.profit, prevQ?.profit ?? null)} /></div>
          <div className="mt-3"><Bars values={series.map(r => r.profit)} labels={labels} tone="profit" /></div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF0F7] pt-3 text-[11px] text-[#8A96A8]">
        <span>{nextEarnings ? <>Next results expected <span className="font-semibold text-[#0D1117]">{formatTradeDate(nextEarnings)}</span></> : 'Next results date not announced'}</span>
        <span>Standalone and consolidated basis follow the data feed. Figures in ₹ crore.</span>
      </div>
    </section>
  );
}
