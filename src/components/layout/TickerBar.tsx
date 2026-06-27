'use client';

import { INDICES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export default function TickerBar() {
  const items = [...INDICES, ...INDICES];

  return (
    <div className="bg-[#1C2D3D] text-white h-9 flex items-center overflow-hidden border-b border-white/5">
      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((idx, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-5 border-r border-white/10">
            <span className="text-[11px] text-white/50 font-medium tracking-wide">{idx.name}</span>
            <span className="text-[11px] font-mono font-semibold text-white">{idx.value.toLocaleString('en-IN')}</span>
            <span className={cn('text-[11px] font-mono font-semibold', idx.changePct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {idx.changePct >= 0 ? '▲' : '▼'} {Math.abs(idx.changePct).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 35s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
