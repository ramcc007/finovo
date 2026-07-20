'use client';

import { useEffect, useState } from 'react';
import { cn, formatTradeDate } from '@/lib/utils';

interface Index {
  symbol: string;
  name: string;
  last: number | null;
  change: number | null;
  change_pct: number | null;
}

// Index levels only move once a day (the EOD archive job) — polling every
// few minutes just re-confirms the same numbers, so this is set low to catch
// same-day corrections rather than to feel "live".
const POLL_MS = 5 * 60_000;

export default function TickerBar() {
  const [items, setItems] = useState<Index[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch('/api/live/indices')
        .then(r => r.json())
        .then(d => {
          if (!alive) return;
          setItems(d.indices ?? []);
          setUpdatedAt(d.updatedAt ?? null);
        })
        .catch(() => { if (alive) setItems([]); });
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Nothing real to show yet — slim placeholder rather than fake index values.
  if (items.length === 0) {
    return <div className="bg-white h-9 border-b border-[#E9EDF4]" />;
  }

  const loop = [...items, ...items];

  return (
    <div
      className="bg-white text-[#131A24] h-9 flex items-center overflow-hidden border-b border-[#E9EDF4]"
      title={updatedAt ? `As of ${formatTradeDate(updatedAt)} close` : undefined}
    >
      {/* Clip the scrolling strip to its own slot — without this, the
          translateX animation can paint outside its intended bounds. */}
      <div className="flex-1 min-w-0 h-full overflow-hidden flex items-center">
        <div className="flex items-center animate-ticker whitespace-nowrap">
          {loop.map((idx, i) => {
            const pos = (idx.change_pct ?? 0) >= 0;
            return (
              <span key={i} className="inline-flex items-center gap-2 px-5 border-r border-[#EEF1F7]">
                <span className="text-[11px] text-[#56616F] font-semibold tracking-wide uppercase">{idx.name}</span>
                <span className="text-[11px] font-mono font-semibold text-[#131A24]">
                  {idx.last != null ? idx.last.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                </span>
                <span className={cn('text-[11px] font-mono font-semibold', pos ? 'text-[#15A05B]' : 'text-[#E0392B]')}>
                  {pos ? '▲' : '▼'} {Math.abs(idx.change_pct ?? 0).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 45s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
