'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn, formatPrice } from '@/lib/utils';

interface Mover {
  symbol: string; price: number | null; change_pct: number | null;
}

export default function TickerBar() {
  const [items, setItems] = useState<Mover[]>([]);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    fetch('/api/markets')
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        // Interleave the day's biggest movers (up and down) into one strip.
        const g: Mover[] = (d.gainers ?? []).slice(0, 8);
        const l: Mover[] = (d.losers ?? []).slice(0, 8);
        const merged: Mover[] = [];
        for (let i = 0; i < Math.max(g.length, l.length); i++) {
          if (g[i]) merged.push(g[i]);
          if (l[i]) merged.push(l[i]);
        }
        setItems(merged);
      })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, []);

  // Nothing real to show yet — render a slim placeholder rather than fake tickers.
  if (items.length === 0) {
    return <div className="bg-white h-9 border-b border-[#E9EDF4]" />;
  }

  const loop = [...items, ...items];

  return (
    <div className="bg-white text-[#131A24] h-9 flex items-center overflow-hidden border-b border-[#E9EDF4]">
      <div className="flex animate-ticker whitespace-nowrap">
        {loop.map((idx, i) => {
          const pos = (idx.change_pct ?? 0) >= 0;
          return (
            <button
              key={i}
              onClick={() => router.push(`/stocks/${idx.symbol}`)}
              className="inline-flex items-center gap-2 px-5 border-r border-[#EEF1F7] hover:bg-[#F7F9FC] transition-colors h-9"
            >
              <span className="text-[11px] text-[#56616F] font-semibold tracking-wide">{idx.symbol}</span>
              <span className="text-[11px] font-mono font-semibold text-[#131A24]">
                {idx.price != null ? `₹${formatPrice(idx.price)}` : '—'}
              </span>
              <span className={cn('text-[11px] font-mono font-semibold', pos ? 'text-[#15A05B]' : 'text-[#E0392B]')}>
                {pos ? '▲' : '▼'} {Math.abs(idx.change_pct ?? 0).toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 40s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
