'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { PRE_BUILT_SCREENS, SCREENER_STOCKS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export default function ScreensPage() {
  const router = useRouter();

  const categoryMap: Record<string, typeof PRE_BUILT_SCREENS> = {
    Quality: PRE_BUILT_SCREENS.filter(s => ['high-roe-low-debt', 'debt-free'].includes(s.id)),
    Value: PRE_BUILT_SCREENS.filter(s => ['value-picks'].includes(s.id)),
    Income: PRE_BUILT_SCREENS.filter(s => ['dividend-stars'].includes(s.id)),
    Momentum: PRE_BUILT_SCREENS.filter(s => ['momentum'].includes(s.id)),
    Special: PRE_BUILT_SCREENS.filter(s => ['turnaround'].includes(s.id)),
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1A1917]">Pre-built Screens</h1>
            <p className="text-sm text-[#6B6966] mt-0.5">Ready-made filters based on proven investing frameworks</p>
          </div>
          <Link href="/screener" className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#4F46E5] px-4 py-2 rounded-[8px] hover:bg-[#4338CA] transition-colors">
            Custom Screener <ArrowRight size={14} />
          </Link>
        </div>

        <div className="space-y-8">
          {Object.entries(categoryMap).map(([category, screens]) => (
            <div key={category}>
              <h2 className="text-xs font-semibold text-[#6B6966] uppercase tracking-wide mb-3">{category} Investing</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {screens.map(screen => (
                  <div
                    key={screen.id}
                    className="card-plain p-5 hover:shadow-md transition-all cursor-pointer group"
                    style={{ borderTop: `3px solid ${screen.color}` }}
                    onClick={() => router.push('/screener')}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-[#1A1917] text-sm group-hover:text-[#4F46E5] transition-colors">{screen.title}</h3>
                      <span className="num text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F1F0ED] text-[#6B6966] shrink-0 ml-2">{screen.count} stocks</span>
                    </div>
                    <p className="text-xs text-[#6B6966] mb-3 leading-relaxed">{screen.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {screen.filters.split('·').map(f => (
                        <span key={f} className="text-[11px] font-mono bg-[#F8F7F4] text-[#9C9894] px-2 py-0.5 rounded border border-[#EEEDE9]">{f.trim()}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#4F46E5] font-medium group-hover:gap-2 transition-all">
                      View stocks <ArrowRight size={12} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sample stocks table */}
        <div className="mt-8 card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EEEDE9]">
            <h3 className="font-semibold text-[#1A1917] text-sm">Sample: High Quality Compounders</h3>
            <p className="text-xs text-[#9C9894] mt-0.5">ROE &gt; 20% · Debt/Equity &lt; 0.5 · Profit Growth 3Y &gt; 15%</p>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Sector</th>
                <th>Price (₹)</th>
                <th>P/E</th>
                <th>ROE %</th>
                <th>Rev Gr 1Y</th>
                <th>D/E</th>
              </tr>
            </thead>
            <tbody>
              {SCREENER_STOCKS.filter(s => s.roe > 20 && s.debtEquity < 0.5).slice(0, 8).map(s => (
                <tr key={s.symbol} onClick={() => router.push(`/stocks/${s.symbol}`)}>
                  <td>
                    <div className="font-semibold text-[#4F46E5]">{s.symbol}</div>
                    <div className="text-[11px] text-[#9C9894] font-sans mt-0.5 max-w-[160px] truncate">{s.name}</div>
                  </td>
                  <td className="text-[#6B6966] font-sans text-xs">{s.sector}</td>
                  <td>₹ {s.price.toLocaleString('en-IN')}</td>
                  <td className={s.pe < 25 ? 'text-positive' : ''}>{s.pe}x</td>
                  <td className="text-positive font-semibold">{s.roe}%</td>
                  <td className={cn(s.revGrowth1Y >= 0 ? 'text-positive' : 'text-negative')}>
                    {s.revGrowth1Y >= 0 ? '+' : ''}{s.revGrowth1Y}%
                  </td>
                  <td className="text-positive">{s.debtEquity}x</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-[#EEEDE9]">
            <Link href="/screener" className="text-xs text-[#4F46E5] hover:underline flex items-center gap-1">
              Open in Screener with these filters <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
