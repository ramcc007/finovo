'use client';

import { useEffect, useState } from 'react';
import { cn, formatPrice, formatTradeDate, formatVolume } from '@/lib/utils';
import type { Technicals } from '@/lib/technicals';

const pct = (v: number | null, digits = 1) => (v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}%`);
const tone = (v: number | null) => (v == null ? 'text-[#8A96A8]' : v >= 0 ? 'text-positive' : 'text-negative');

function Row({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#EDF0F7] py-2.5 last:border-0">
      <span className="text-sm text-[#4A5568]">{label}</span>
      <span className="text-right">
        <span className={cn('num text-sm font-semibold text-[#0D1117]', className)}>{value}</span>
        {sub && <span className="block text-[11px] text-[#8A96A8]">{sub}</span>}
      </span>
    </div>
  );
}

/** Returns, moving averages, RSI, volume and volatility, worked out from the stored daily prices. */
export default function TechnicalsCard({ symbol }: { symbol: string }) {
  const [t, setT] = useState<Technicals | null | undefined>(undefined);
  const [delivery, setDelivery] = useState<{ latest: { date: string; pct: number }; avg20: number; series: { date: string; pct: number }[] } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/technicals`)
      .then(r => r.json())
      .then(d => { if (alive) { setT(d?.technicals ?? null); setDelivery(d?.delivery ?? null); } })
      .catch(() => { if (alive) setT(null); });
    return () => { alive = false; };
  }, [symbol]);

  if (t === null) return null; // not enough history: show nothing rather than an empty card
  if (t === undefined) return <div className="card p-5"><div className="h-5 w-48 animate-pulse rounded bg-[#EEF1F7]" /><div className="mt-4 h-40 animate-pulse rounded bg-[#EEF1F7]" /></div>;

  const rsiNote = t.rsi14 == null ? undefined : t.rsi14 >= 70 ? 'Above 70' : t.rsi14 <= 30 ? 'Below 30' : 'Between 30 and 70';

  return (
    <section className="card p-5" aria-labelledby="tech-h">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 id="tech-h" className="text-xs font-semibold uppercase tracking-wide text-[#4A5568]">Performance &amp; technicals</h3>
        <span className="text-[11px] text-[#8A96A8]">As of {formatTradeDate(t.asOf)}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {t.returns.map(r => (
          <div key={r.label} className="rounded-lg bg-[#F4F6FA] px-2 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8A96A8]">{r.label}</div>
            <div className={cn('num mt-0.5 text-sm font-bold', tone(r.pct))}>{pct(r.pct)}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
        <div>
          <Row label="From 52-week high" value={pct(t.fromHigh52)} className={tone(t.fromHigh52)} />
          <Row label="Above 52-week low" value={pct(t.fromLow52)} className={tone(t.fromLow52)} />
          <Row label="50-day average" value={t.sma50 != null ? `₹ ${formatPrice(t.sma50)}` : '—'} sub={t.vsSma50 != null ? `Price is ${Math.abs(t.vsSma50).toFixed(1)}% ${t.vsSma50 >= 0 ? 'above' : 'below'}` : undefined} />
          <Row label="200-day average" value={t.sma200 != null ? `₹ ${formatPrice(t.sma200)}` : '—'} sub={t.vsSma200 != null ? `Price is ${Math.abs(t.vsSma200).toFixed(1)}% ${t.vsSma200 >= 0 ? 'above' : 'below'}` : undefined} />
        </div>
        <div>
          <Row label="RSI (14 days)" value={t.rsi14 ?? '—'} sub={rsiNote} />
          <Row label="Volume vs 20-day average" value={t.volumeVsAvg != null ? `${t.volumeVsAvg.toFixed(1)}x` : '—'} sub={t.avgVolume20 != null ? `20-day average ${formatVolume(t.avgVolume20)}` : undefined} />
          <Row label="Volatility (1 year)" value={t.volatility1y != null ? `${t.volatility1y.toFixed(1)}%` : '—'} sub="Annualised, from daily moves" />
        </div>
      </div>
      {delivery && (
        <div className="mt-4 border-t border-[#EDF0F7] pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4A5568]">Delivery</h4>
            <span className="text-[11px] text-[#8A96A8]">Share of traded shares taken for delivery</span>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <div className="num text-2xl font-bold text-[#0D1117]">{delivery.latest.pct.toFixed(1)}%</div>
              <div className="text-[11px] text-[#8A96A8]">on {formatTradeDate(delivery.latest.date)}</div>
            </div>
            <div>
              <div className="num text-lg font-semibold text-[#0D1117]">{delivery.avg20.toFixed(1)}%</div>
              <div className="text-[11px] text-[#8A96A8]">average, last 20 sessions</div>
            </div>
            <div className="flex h-12 flex-1 items-end gap-[3px]" role="img" aria-label={`Delivery percentage over the last ${delivery.series.length} sessions`}>
              {delivery.series.map(d => (
                <div key={d.date} title={`${formatTradeDate(d.date)}: ${d.pct.toFixed(1)}%`} className="min-w-[3px] flex-1 rounded-sm bg-[#C7D2FE]" style={{ height: `${Math.max(6, Math.min(100, d.pct))}%` }} />
              ))}
            </div>
          </div>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-[#8A96A8]">Worked out from daily closing prices and NSE delivery data. Information only, not a recommendation.</p>
    </section>
  );
}
