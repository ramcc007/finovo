'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, BarChart2, TrendingUp, TrendingDown } from 'lucide-react';
import TickerBar from '@/components/layout/TickerBar';
import { TOP_GAINERS, TOP_LOSERS, SECTORS, PRE_BUILT_SCREENS, SCREENER_STOCKS } from '@/lib/mock-data';
import { cn, formatPrice } from '@/lib/utils';

function ChangeBadge({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold', pos ? 'badge-positive' : 'badge-negative')}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers'>('gainers');
  const [query, setQuery] = useState('');
  const router = useRouter();

  const searchResults = query.length > 1
    ? SCREENER_STOCKS.filter(s =>
        s.symbol.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const stocks = activeTab === 'gainers' ? TOP_GAINERS : TOP_LOSERS;

  return (
    <div className="min-h-screen">
      <TickerBar />

      {/* Hero */}
      <div className="bg-white border-b border-[#E2E8F0] py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-[28px] font-bold text-[#0D1117] mb-2">
            Screen, Analyse &amp; Research Indian Stocks
          </h1>
          <p className="text-[#4A5568] text-base mb-8">
            Fundamental data for 5000+ NSE &amp; BSE listed companies — completely free.
          </p>

          <div className="relative max-w-[560px] mx-auto">
            <div className="flex items-center gap-3 bg-[#F4F6FA] border border-[#E2E8F0] rounded-xl px-5 py-3.5 shadow-sm">
              <Search size={18} className="text-[#8A96A8] shrink-0" />
              <input
                type="text"
                placeholder="Search by company name or symbol — e.g. TCS, Reliance, HDFC..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    router.push(`/stocks/${searchResults[0].symbol}`);
                    setQuery('');
                  }
                }}
                className="bg-transparent text-[15px] text-[#0D1117] placeholder:text-[#8A96A8] outline-none flex-1"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#E2E8F0] rounded-[10px] shadow-md overflow-hidden z-50 text-left">
                {searchResults.map(s => (
                  <Link
                    key={s.symbol}
                    href={`/stocks/${s.symbol}`}
                    onClick={() => setQuery('')}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#FFF7ED] transition-colors"
                  >
                    <div>
                      <span className="text-sm font-semibold text-[#0D1117]">{s.symbol}</span>
                      <span className="text-xs text-[#4A5568] ml-2">{s.name}</span>
                    </div>
                    <span className="text-xs text-[#8A96A8] bg-[#EEF1F7] px-2 py-0.5 rounded-sm">{s.sector}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {['TCS', 'RELIANCE', 'HDFCBANK', 'BAJFINANCE', 'INFY'].map(sym => (
              <Link key={sym} href={`/stocks/${sym}`} className="text-xs text-[#F97316] bg-[#FFF7ED] px-3 py-1 rounded-full hover:bg-[#FED7AA] transition-colors font-medium">
                {sym}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Movers + Breadth */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#EDF0F7]">
              <h2 className="font-semibold text-[#0D1117] text-sm">Market Movers</h2>
              <div className="flex gap-1">
                {(['gainers', 'losers'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors',
                      activeTab === tab ? 'bg-[#F97316] text-white' : 'text-[#4A5568] hover:bg-[#EEF1F7]'
                    )}
                  >
                    {tab === 'gainers' ? '▲ Top Gainers' : '▼ Top Losers'}
                  </button>
                ))}
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Price (₹)</th>
                  <th>Change</th>
                  <th>Volume</th>
                  <th>Mkt Cap</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map(s => (
                  <tr key={s.symbol} onClick={() => router.push(`/stocks/${s.symbol}`)}>
                    <td>
                      <div className="font-semibold text-[#F97316]">{s.symbol}</div>
                      <div className="text-[11px] text-[#8A96A8] font-sans mt-0.5">{s.name}</div>
                    </td>
                    <td>₹ {formatPrice(s.price)}</td>
                    <td><ChangeBadge value={s.changePct} /></td>
                    <td className="text-[#4A5568]">{s.volume}</td>
                    <td className="text-[#4A5568]">{s.marketCap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="font-semibold text-[#0D1117] text-sm mb-4">Market Breadth</h2>
              <div className="space-y-3">
                {[
                  { label: 'Advances', value: 1284, color: '#16A34A' },
                  { label: 'Declines', value: 932, color: '#DC2626' },
                  { label: 'Unchanged', value: 124, color: '#8A96A8' },
                  { label: '52W Highs', value: 47, color: '#F97316' },
                  { label: '52W Lows', value: 12, color: '#D97706' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-sm text-[#4A5568]">{item.label}</span>
                    </div>
                    <span className="num text-sm font-semibold text-[#0D1117]">{item.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-1.5 rounded-full overflow-hidden flex">
                <div className="h-full bg-[#16A34A]" style={{ width: '57%' }} />
                <div className="h-full bg-[#8A96A8]" style={{ width: '6%' }} />
                <div className="h-full bg-[#DC2626]" style={{ width: '37%' }} />
              </div>
              <div className="flex justify-between text-[10px] text-[#8A96A8] mt-1">
                <span>Bullish</span><span>Bearish</span>
              </div>
            </div>

            <div className="card-plain p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-3">FII / DII Activity</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#4A5568]">FII Net</span>
                <span className="num text-sm font-semibold text-[#16A34A]">+₹1,248 Cr</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#4A5568]">DII Net</span>
                <span className="num text-sm font-semibold text-[#DC2626]">−₹432 Cr</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sector Heatmap */}
        <div className="card p-5">
          <h2 className="font-semibold text-[#0D1117] text-sm mb-4">Sector Performance Today</h2>
          <div className="flex flex-wrap gap-2">
            {SECTORS.map(s => {
              const intensity = Math.min(Math.abs(s.change) / 2, 1);
              const pos = s.change >= 0;
              const bg = pos
                ? `rgba(22,163,74,${0.1 + intensity * 0.3})`
                : `rgba(220,38,38,${0.1 + intensity * 0.3})`;
              return (
                <div key={s.name} className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] cursor-pointer transition-transform hover:scale-[1.02]" style={{ background: bg }}>
                  <span className="text-sm font-medium text-[#0D1117]">{s.name}</span>
                  <span className={cn('text-xs font-mono font-semibold', pos ? 'text-positive' : 'text-negative')}>
                    {pos ? '+' : ''}{s.change.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Screens */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-semibold text-[#0D1117]">Popular Screens</h2>
            <Link href="/screens" className="text-sm text-[#F97316] hover:underline flex items-center gap-1">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRE_BUILT_SCREENS.map(screen => (
              <Link
                key={screen.id}
                href={`/screens`}
                className="card-plain p-5 hover:shadow-md transition-shadow group"
                style={{ borderTop: `3px solid ${screen.color}` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[#0D1117] text-sm group-hover:text-[#F97316] transition-colors">{screen.title}</h3>
                  <span className="num text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EEF1F7] text-[#4A5568]">{screen.count}</span>
                </div>
                <p className="text-xs text-[#4A5568] mb-3 leading-relaxed">{screen.description}</p>
                <p className="text-[11px] text-[#8A96A8] font-mono">{screen.filters}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-8">
          {[
            { label: 'Listed Companies', value: '5,000+', icon: BarChart2 },
            { label: 'Sectors Covered', value: '24', icon: TrendingUp },
            { label: 'Financial Metrics', value: '47+', icon: TrendingDown },
            { label: 'Years of Data', value: '10Y', icon: BarChart2 },
          ].map(stat => (
            <div key={stat.label} className="card-plain p-4 text-center">
              <div className="num text-2xl font-bold text-[#F97316] mb-1">{stat.value}</div>
              <div className="text-xs text-[#4A5568]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
