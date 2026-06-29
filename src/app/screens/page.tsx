'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PRE_BUILT_SCREENS } from '@/lib/mock-data';
import { cn, formatPrice, formatCrores } from '@/lib/utils';

interface SampleRow {
  symbol: string; name: string; sector: string; price: number;
  pe: number; roe: number; revenue_growth_1y: number; debt_to_equity: number; market_cap: number;
}

export default function ScreensPage() {
  const router = useRouter();
  const [sample, setSample] = useState<SampleRow[] | null>(null);

  // Real "high quality compounders" sample, run against the live screener.
  useEffect(() => {
    let alive = true;
    fetch('/api/screener?roe_min=20&debt_equity_max=0.5&sort_by=roe&sort_dir=desc&per_page=8')
      .then(r => r.json())
      .then(d => { if (alive) setSample(d.data ?? []); })
      .catch(() => { if (alive) setSample([]); });
    return () => { alive = false; };
  }, []);

  const categoryMap: Record<string, typeof PRE_BUILT_SCREENS> = {
    Quality: PRE_BUILT_SCREENS.filter(s => ['high-roe-low-debt', 'debt-free'].includes(s.id)),
    Value: PRE_BUILT_SCREENS.filter(s => ['value-picks'].includes(s.id)),
    Income: PRE_BUILT_SCREENS.filter(s => ['dividend-stars'].includes(s.id)),
    Momentum: PRE_BUILT_SCREENS.filter(s => ['momentum'].includes(s.id)),
    Special: PRE_BUILT_SCREENS.filter(s => ['turnaround'].includes(s.id)),
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="flex items-end justify-between mb-9 gap-4">
          <div>
            <h1 className="h-section text-[#0D1117]">Pre-built Screens</h1>
            <p className="text-sm text-[#4A5568] mt-1">Ready-made filters based on proven investing frameworks.</p>
          </div>
          <Link href="/screener" className="btn btn-primary shrink-0">
            Custom Explorer <ArrowRight size={14} />
          </Link>
        </div>

        <div className="space-y-10">
          {Object.entries(categoryMap).map(([category, screens]) => (
            <div key={category}>
              <h2 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-4">{category} Investing</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {screens.map(screen => (
                  <div
                    key={screen.id}
                    className="card-plain lift p-6 cursor-pointer group"
                    style={{ borderTop: `3px solid ${screen.color}` }}
                    onClick={() => router.push('/screener')}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-[#0D1117] text-sm group-hover:text-[#F97316] transition-colors">{screen.title}</h3>
                      <ArrowRight size={15} className="text-[#8A96A8] group-hover:text-[#F97316] transition-colors shrink-0 mt-0.5" />
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
        <div className="mt-10 card p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EDF0F7]">
            <h3 className="font-semibold text-[#0D1117] text-sm">Sample: High Quality Compounders</h3>
            <p className="text-xs text-[#8A96A8] mt-0.5">ROE &gt; 20% · Debt/Equity &lt; 0.5 · sorted by ROE · live data</p>
          </div>
          <div className="overflow-x-auto">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Company</th>
                <th>Sector</th>
                <th>Price (₹)</th>
                <th>Mkt Cap</th>
                <th>P/E</th>
                <th>ROE %</th>
                <th>Rev Gr 1Y</th>
                <th>D/E</th>
              </tr>
            </thead>
            <tbody>
              {sample === null ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i}>{Array(8).fill(0).map((_, j) => (
                    <td key={j}><div className="h-4 bg-[#EEF1F7] rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : sample.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-[#8A96A8] font-sans">Screen data is updating — check back after the next market close.</td></tr>
              ) : sample.map(s => (
                <tr key={s.symbol} className="group" onClick={() => router.push(`/stocks/${s.symbol}`)}>
                  <td>
                    <div className="font-semibold text-[#0D1117] group-hover:text-[#F97316] transition-colors">{s.symbol}</div>
                    <div className="text-[11px] text-[#8A96A8] font-sans mt-0.5 max-w-[180px] truncate">{s.name}</div>
                  </td>
                  <td className="text-[#4A5568] font-sans text-xs">{s.sector}</td>
                  <td>{s.price != null ? formatPrice(s.price) : '—'}</td>
                  <td className="text-[#4A5568]">{s.market_cap != null ? formatCrores(s.market_cap) : '—'}</td>
                  <td className={s.pe && s.pe < 25 ? 'text-positive' : ''}>{s.pe ? `${s.pe}x` : '—'}</td>
                  <td className="text-positive font-semibold">{s.roe != null ? `${s.roe}%` : '—'}</td>
                  <td className={cn(s.revenue_growth_1y == null ? '' : s.revenue_growth_1y >= 0 ? 'text-positive' : 'text-negative')}>
                    {s.revenue_growth_1y != null ? `${s.revenue_growth_1y >= 0 ? '+' : ''}${s.revenue_growth_1y}%` : '—'}
                  </td>
                  <td className="text-positive">{s.debt_to_equity != null ? `${s.debt_to_equity}x` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="px-5 py-3 border-t border-[#EDF0F7]">
            <Link href="/screener" className="text-xs text-[#F97316] hover:underline flex items-center gap-1">
              Open in Explorer with these filters <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
