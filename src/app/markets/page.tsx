'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import TickerBar from '@/components/layout/TickerBar';
import { INDICES, TOP_GAINERS, TOP_LOSERS, SECTORS } from '@/lib/mock-data';
import { cn, formatPrice } from '@/lib/utils';

type MarketTab = 'gainers' | 'losers' | '52high' | '52low' | 'active';

export default function MarketsPage() {
  const [tab, setTab] = useState<MarketTab>('gainers');
  const router = useRouter();
  const stocks = tab === 'losers' ? TOP_LOSERS : TOP_GAINERS;

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <TickerBar />
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[#0D1117]">Market Overview</h1>
          <p className="text-sm text-[#4A5568] mt-0.5">Live data — NSE & BSE · Last updated: 3:30 PM</p>
        </div>

        {/* Index Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {INDICES.map(idx => (
            <div key={idx.name} className="card-plain p-4">
              <div className="text-xs text-[#4A5568] mb-1">{idx.name}</div>
              <div className="num text-lg font-bold text-[#0D1117]">{idx.value.toLocaleString('en-IN')}</div>
              <div className={cn('num text-xs font-semibold mt-1', idx.changePct >= 0 ? 'text-positive' : 'text-negative')}>
                {idx.changePct >= 0 ? '▲' : '▼'} {idx.change.toFixed(2)} ({Math.abs(idx.changePct).toFixed(2)}%)
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main table */}
          <div className="lg:col-span-2 card p-0 overflow-hidden">
            <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-[#EDF0F7] flex-wrap">
              {[
                { key: 'gainers', label: '▲ Top Gainers' },
                { key: 'losers', label: '▼ Top Losers' },
                { key: 'active', label: '⚡ Most Active' },
                { key: '52high', label: '↑ 52W High' },
                { key: '52low', label: '↓ 52W Low' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as MarketTab)}
                  className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors',
                    tab === t.key ? 'bg-[#F97316] text-white' : 'text-[#4A5568] hover:bg-[#EEF1F7]'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Price (₹)</th>
                  <th>Change</th>
                  <th>% Change</th>
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
                    <td className={s.change >= 0 ? 'text-positive' : 'text-negative'}>
                      {s.change >= 0 ? '+' : ''}₹{Math.abs(s.change).toFixed(2)}
                    </td>
                    <td>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold', s.changePct >= 0 ? 'badge-positive' : 'badge-negative')}>
                        {s.changePct >= 0 ? '▲' : '▼'} {Math.abs(s.changePct).toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-[#4A5568]">{s.volume}</td>
                    <td className="text-[#4A5568]">{s.marketCap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Sector Performance */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[#0D1117] mb-4">Sector Performance</h3>
              <div className="space-y-2.5">
                {SECTORS.map(s => {
                  const pos = s.change >= 0;
                  const barWidth = Math.min(Math.abs(s.change) / 2 * 100, 100);
                  return (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#4A5568]">{s.name}</span>
                        <span className={cn('num text-xs font-semibold', pos ? 'text-positive' : 'text-negative')}>
                          {pos ? '+' : ''}{s.change.toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#EEF1F7] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${barWidth}%`, background: pos ? '#16A34A' : '#DC2626' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FII/DII */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[#0D1117] mb-4">FII / DII Activity</h3>
              <div className="space-y-3">
                {[
                  { label: 'FII Buy', value: '₹8,432 Cr', color: '#16A34A' },
                  { label: 'FII Sell', value: '₹7,184 Cr', color: '#DC2626' },
                  { label: 'FII Net', value: '+₹1,248 Cr', bold: true, color: '#16A34A' },
                  { label: 'DII Buy', value: '₹5,234 Cr', color: '#16A34A' },
                  { label: 'DII Sell', value: '₹5,666 Cr', color: '#DC2626' },
                  { label: 'DII Net', value: '−₹432 Cr', bold: true, color: '#DC2626' },
                ].map(item => (
                  <div key={item.label} className={cn('flex justify-between items-center', item.bold ? 'border-t border-[#EDF0F7] pt-2 mt-1' : '')}>
                    <span className={cn('text-sm text-[#4A5568]', item.bold ? 'font-semibold text-[#0D1117]' : '')}>{item.label}</span>
                    <span className={cn('num text-sm', item.bold ? 'font-bold' : 'font-medium')} style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Breadth */}
            <div className="card-plain p-4">
              <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-3">Market Breadth (NSE)</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Up', value: 1284, color: '#16A34A' },
                  { label: 'Down', value: 932, color: '#DC2626' },
                  { label: 'Flat', value: 124, color: '#8A96A8' },
                ].map(b => (
                  <div key={b.label} className="p-2 rounded-[8px] bg-[#F4F6FA]">
                    <div className="num text-lg font-bold" style={{ color: b.color }}>{b.value}</div>
                    <div className="text-[11px] text-[#8A96A8]">{b.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
