'use client';

import { useEffect, useState } from 'react';
import { cn, freshnessLabel } from '@/lib/utils';

interface Index {
  symbol: string;
  name: string;
  last: number | null;
  change: number | null;
  change_pct: number | null;
}

// During market hours the quotes job writes new index levels about once a
// minute, so a visible tab checks once a minute. A hidden tab does not poll.
const POLL_MS = 60_000;
const LIVE_WINDOW_MS = 10 * 60_000;

export default function TickerBar() {
  const [items, setItems] = useState<Index[]>([]);
  const [status, setStatus] = useState<{ label: string; live: boolean }>({ label: '', live: false });

  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.visibilityState === 'hidden') return;
      fetch('/api/live/indices', { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
          if (!alive) return;
          setItems(d.indices ?? []);
          const at = d.updatedAt ?? null;
          setStatus({ label: freshnessLabel(at, LIVE_WINDOW_MS / 60_000), live: !!at && Date.now() - Date.parse(at) < LIVE_WINDOW_MS });
        })
        .catch(() => { if (alive) setItems([]); });
    };
    load();
    const t = setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', load); };
  }, []);

  // Nothing real to show yet — slim placeholder rather than fake index values.
  if (items.length === 0) {
    return <div className="bg-white h-9 border-b border-[#E9EDF4]" />;
  }

  const loop = [...items, ...items];
  const { label, live } = status;

  return (
    <div
      className="bg-white text-[#131A24] h-9 flex items-center overflow-hidden border-b border-[#E9EDF4]"
      title={label || undefined}
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
                {idx.change_pct != null && (
                  <span className={cn('text-[11px] font-mono font-semibold', pos ? 'text-[#15A05B]' : 'text-[#E0392B]')}>
                    {pos ? '▲' : '▼'} {Math.abs(idx.change_pct).toFixed(2)}%
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
      {label && (
        <span className="hidden sm:inline-flex h-full shrink-0 items-center gap-1.5 border-l border-[#EEF1F7] px-3 text-[10px] font-semibold uppercase tracking-wide text-[#8A96A8]">
          {live && <span className="relative flex h-1.5 w-1.5" aria-hidden><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#15A05B] opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#15A05B]" /></span>}
          {label.replace(/^As of /, '').replace(/ close$/, ' close')}
        </span>
      )}
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
