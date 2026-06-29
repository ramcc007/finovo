'use client';

import { INDICES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export default function TickerBar() {
  const items = [...INDICES, ...INDICES];

  return (
    <div className="bg-white text-[#131A24] h-9 flex items-center overflow-hidden border-b border-[#E9EDF4]">
      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((idx, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-5 border-r border-[#EEF1F7]">
            <span className="text-[11px] text-[#8A94A4] font-medium tracking-wide">{idx.name}</span>
            <span className="text-[11px] font-mono font-semibold text-[#131A24]">{idx.value.toLocaleString('en-IN')}</span>
            <span className={cn('text-[11px] font-mono font-semibold', idx.changePct >= 0 ? 'text-[#15A05B]' : 'text-[#E0392B]')}>
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
