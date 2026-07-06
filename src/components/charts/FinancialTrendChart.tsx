'use client';

interface Props {
  data: Array<Record<string, unknown>>;
  periodKey: string;
  revKey: string;
  npKey: string;
}

/** Revenue vs Net Profit trend, oldest → newest. A plain CSS bar chart —
 * lightweight-charts is built for continuous time series, not the small
 * set of discrete fiscal periods (annual/quarterly) this renders. */
export default function FinancialTrendChart({ data, periodKey, revKey, npKey }: Props) {
  // API returns periods newest-first; a trend reads left-to-right oldest-first.
  const rows = [...data].reverse().map((r, i) => ({
    period: String(r[periodKey] ?? r.period ?? r.year ?? `P${i + 1}`),
    revenue: Number(r[revKey] ?? 0) || 0,
    netProfit: Number(r[npKey] ?? 0) || 0,
  }));

  if (rows.length === 0) return null;

  const maxVal = Math.max(1, ...rows.map(r => Math.max(r.revenue, Math.abs(r.netProfit))));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide">Revenue vs Net Profit Trend</h3>
        <div className="flex items-center gap-3 text-[11px] text-[#4A5568]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#93C5FD]" /> Revenue</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#F97316]" /> Net Profit</span>
        </div>
      </div>

      <div className="flex items-end gap-3 sm:gap-5 h-48 px-1">
        {rows.map(r => (
          <div key={r.period} className="flex-1 flex flex-col items-center justify-end h-full group min-w-0">
            <div className="flex items-end gap-0.5 h-full w-full justify-center">
              <div
                className="w-1/2 max-w-[18px] bg-[#93C5FD] rounded-t-sm transition-all group-hover:bg-[#60A5FA]"
                style={{ height: `${(r.revenue / maxVal) * 100}%`, minHeight: r.revenue !== 0 ? 2 : 0 }}
                title={`Revenue: ₹${r.revenue.toLocaleString('en-IN')} Cr`}
              />
              <div
                className={`w-1/2 max-w-[18px] rounded-t-sm transition-all ${r.netProfit < 0 ? 'bg-[#FCA5A5] group-hover:bg-[#F87171]' : 'bg-[#F97316] group-hover:bg-[#EA580C]'}`}
                style={{ height: `${(Math.abs(r.netProfit) / maxVal) * 100}%`, minHeight: r.netProfit !== 0 ? 2 : 0 }}
                title={`Net Profit: ₹${r.netProfit.toLocaleString('en-IN')} Cr`}
              />
            </div>
            <span className="text-[10px] text-[#8A96A8] mt-2 whitespace-nowrap">{r.period}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
