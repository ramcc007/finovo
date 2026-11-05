'use client';

import { useState } from 'react';
import { formatTradeDate } from '@/lib/utils';

interface Action { id: number; action_type: string; ex_date: string | null; purpose: string | null }

const amountOf = (purpose: string | null): number | null => {
  const m = purpose?.match(/Rs\.?\s*([\d.]+)/i);
  const v = m ? Number(m[1]) : NaN;
  return isFinite(v) && v > 0 ? v : null;
};

/** Dividends per share by year, and the most recent payouts. Hidden when a company has paid none. */
export default function DividendCard({ actions }: { actions: Action[] }) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const divs = actions
    .filter(a => /dividend/i.test(a.action_type) && a.ex_date && amountOf(a.purpose) != null)
    .map(a => ({ id: a.id, date: a.ex_date as string, amount: amountOf(a.purpose) as number, purpose: a.purpose ?? '' }))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (divs.length === 0) return null;

  const byYear = new Map<string, number>();
  for (const d of divs) byYear.set(d.date.slice(0, 4), (byYear.get(d.date.slice(0, 4)) ?? 0) + d.amount);
  const years = [...byYear.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  const max = Math.max(...years.map(y => y[1]));
  const upcoming = divs.filter(d => d.date >= today).slice(-1)[0];

  return (
    <section className="card p-5" aria-labelledby="dv-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="dv-h" className="text-xs font-semibold uppercase tracking-wide text-[#4A5568]">Dividend history</h3>
        <span className="text-[11px] text-[#8A96A8]">₹ per share, by year of the ex-dividend date</span>
      </div>
      {upcoming && (
        <p className="mt-3 rounded-lg bg-[#FFF7ED] px-3 py-2 text-xs text-[#9A3412]">
          Upcoming: ₹{upcoming.amount} per share, ex-dividend {formatTradeDate(upcoming.date)}.
        </p>
      )}
      <div className="mt-4 flex h-24 items-end gap-2" role="img" aria-label={years.map(([y, v]) => `${y}: ₹${v.toFixed(2)}`).join(', ')}>
        {years.map(([y, v]) => (
          <div key={y} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${y}: ₹${v.toFixed(2)} per share`}>
            <span className="num text-[10px] font-semibold text-[#0D1117]">{v % 1 === 0 ? v : v.toFixed(1)}</span>
            <div className="w-full rounded-sm bg-[#FCD34D]" style={{ height: `${Math.max(8, (v / max) * 70)}%` }} />
            <span className="text-[10px] text-[#8A96A8]">{y}</span>
          </div>
        ))}
      </div>
      <ul className="mt-4 divide-y divide-[#EDF0F7] text-sm">
        {divs.slice(0, 5).map(d => (
          <li key={d.id} className="flex items-baseline justify-between gap-3 py-2">
            <span className="text-[#4A5568]">{formatTradeDate(d.date)}</span>
            <span className="num font-semibold text-[#0D1117]">₹{d.amount}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
