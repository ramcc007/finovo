import type { PeerMetric } from '@/lib/peerStats';

const show = (v: number, unit: string) => `${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${unit}`;

/** Where the company sits among sector peers on each measure: its value, the sector median, and a position bar. */
export default function PeerStatsCard({ symbol, sector, metrics }: { symbol: string; sector: string | null; metrics: PeerMetric[] }) {
  if (metrics.length === 0) return null;
  return (
    <section className="card p-5" aria-labelledby="ps-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="ps-h" className="text-sm font-semibold text-[#0D1117]">{symbol} against {sector ?? 'sector'} peers</h3>
        <span className="text-[11px] text-[#8A96A8]">Based on latest ratios of {Math.max(...metrics.map(m => m.total)).toLocaleString('en-IN')} listed companies in the sector</span>
      </div>
      <ul className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
        {metrics.map(m => (
          <li key={m.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-[#4A5568]">{m.label}</span>
              <span className="num text-sm font-semibold text-[#0D1117]">{show(m.value, m.unit)}</span>
            </div>
            <div className="relative mt-2 h-2 rounded-full bg-[#EEF1F7]" role="img" aria-label={`${m.label}: higher than ${m.percentile}% of sector peers`}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-[#FDBA74]" style={{ width: `${Math.max(4, m.percentile)}%` }} />
              <div className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 bg-[#0D1117]/50" style={{ left: '50%' }} title="Midpoint of the sector" />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-[#8A96A8]">
              <span>Higher than {m.percentile}% of peers</span>
              <span>Sector median {show(m.median, m.unit)}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-[#8A96A8]">A higher or lower position is not good or bad by itself: a lower P/E can mean a cheaper price or weaker expected growth. Information only, not a recommendation.</p>
    </section>
  );
}
