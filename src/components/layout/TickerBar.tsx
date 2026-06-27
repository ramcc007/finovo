'use client';

import { INDICES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export default function TickerBar() {
  const items = [...INDICES, ...INDICES];

  return (
    <div className="bg-[#1A1917] text-white h-10 flex items-center overflow-hidden">
      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((idx, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-6 border-r border-white/10">
            <span className="text-xs text-white/60 font-medium">{idx.name}</span>
            <span className="text-xs font-mono font-semibold">{idx.value.toLocaleString('en-IN')}</span>
            <span className={cn('text-xs font-mono font-semibold', idx.changePct >= 0 ? 'text-green-400' : 'text-red-400')}>
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
          animation: ticker 30s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
