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
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <div className="flex items-end justify-between mb-7 gap-4">
          <div>
            <h1 className="h-section text-[#0D1117]">Pre-built Screens</h1>
            <p className="text-sm text-[#4A5568] mt-1">Ready-made filters based on proven investing frameworks.</p>
          </div>
          <Link href="/screener" className="btn btn-primary shrink-0">
            Custom Screener <ArrowRight size={14} />
          </Link>
        </div>

        <div className="space-y-8">
          {Object.entries(categoryMap).map(([category, screens]) => (
            <div key={category}>
              <h2 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-3">{category} Investing</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {screens.map(screen => (
                  <div
                    key={screen.id}
                    className="card-plain lift p-5 cursor-pointer group"
                    style={{ borderTop: `3px solid ${screen.color}` }}
                    onClick={() => router.push('/screener')}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-[#0D1117] text-sm group-hover:text-[#F97316] transition-colors">{screen.title}</h3>
                      <span className="num text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EEF1F7] text-[#4A5568] shrink-0 ml-2">{screen.count} stocks</span>
                    </div>
                    <p className="text-xs text-[#4A5568] mb-3 leading-relaxed">{screen.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {screen.filters.split('·').map(f => (
                        <span key={f} className="text-[11px] font-mono bg-[#F4F6FA] text-[#8A96A8] px-2 py-0.5 rounded border border-[#EDF0F7]">{f.trim()}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#F97316] font-medium group-hover:gap-2 transition-all">
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
          <div className="px-5 py-4 border-b border-[#EDF0F7]">
            <h3 className="font-semibold text-[#0D1117] text-sm">Sample: High Quality Compounders</h3>
            <p className="text-xs text-[#8A96A8] mt-0.5">ROE &gt; 20% · Debt/Equity &lt; 0.5 · Profit Growth 3Y &gt; 15%</p>
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
                <tr key={s.symbol} className="group" onClick={() => router.push(`/stocks/${s.symbol}`)}>
                  <td>
                    <div className="font-semibold text-[#0D1117] group-hover:text-[#F97316] transition-colors">{s.symbol}</div>
                    <div className="text-[11px] text-[#8A96A8] font-sans mt-0.5 max-w-[160px] truncate">{s.name}</div>
                  </td>
                  <td className="text-[#4A5568] font-sans text-xs">{s.sector}</td>
                  <td>{s.price.toLocaleString('en-IN')}</td>
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
          <div className="px-5 py-3 border-t border-[#EDF0F7]">
            <Link href="/screener" className="text-xs text-[#F97316] hover:underline flex items-center gap-1">
              Open in Screener with these filters <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
