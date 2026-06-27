'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, Check, ExternalLink } from 'lucide-react';
import { STOCK_TCS, PEERS } from '@/lib/mock-data';
import { cn, formatPrice, formatCrores } from '@/lib/utils';

const TABS = ['Overview', 'Financials', 'Ratios', 'Shareholding', 'Peers'] as const;
type Tab = typeof TABS[number];

function ChangeBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const pos = value >= 0;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded text-sm font-mono font-semibold', pos ? 'badge-positive' : 'badge-negative')}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}{suffix}
    </span>
  );
}

function RatioRow({ label, value, unit = '', industryAvg, inverse = false }: {
  label: string; value: number; unit?: string; industryAvg?: number; inverse?: boolean;
}) {
  let color = '#9C9894';
  if (industryAvg !== undefined) {
    const better = inverse ? value < industryAvg : value > industryAvg;
    color = better ? '#16A34A' : '#D97706';
  }
  const pct = industryAvg ? Math.min((value / (industryAvg * 2)) * 100, 100) : 50;

  return (
    <div className="py-3 border-b border-[#EEEDE9] last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-[#6B6966]">{label}</span>
        <span className="num text-sm font-semibold text-[#1A1917]">{value.toFixed(1)}{unit}</span>
      </div>
      {industryAvg !== undefined && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#F1F0ED] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
          </div>
          <span className="text-[11px] text-[#9C9894] shrink-0">Ind avg: {industryAvg}{unit}</span>
        </div>
      )}
    </div>
  );
}

export default function StockPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const stock = STOCK_TCS;

  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [watchlisted, setWatchlisted] = useState(false);
  const [finPeriod, setFinPeriod] = useState<'annual' | 'quarterly'>('annual');
  const [finTab, setFinTab] = useState<'pl' | 'bs' | 'cf'>('pl');

  const range52w = stock.weekHigh52 - stock.weekLow52;
  const pricePos = ((stock.price - stock.weekLow52) / range52w) * 100;

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Stock Header */}
      <div className="bg-white border-b border-[#E5E4E0]">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#6B6966] hover:text-[#1A1917] mb-4 transition-colors">
            <ArrowLeft size={14} /> Back to results
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-[#1A1917]">{symbol}</h1>
                <div className="flex gap-1.5 flex-wrap">
                  {stock.indices.map(idx => (
                    <span key={idx} className="text-[11px] bg-[#EEF2FF] text-[#4F46E5] px-2 py-0.5 rounded font-medium">{idx}</span>
                  ))}
                </div>
              </div>
              <p className="text-[#6B6966] text-sm mb-1">{stock.name}</p>
              <p className="text-[11px] text-[#9C9894]">
                NSE: {stock.nse} · BSE: {stock.bse} · {stock.sector} · {stock.industry}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              <div className="flex items-center gap-3">
                <span className="num text-3xl font-bold text-[#1A1917]">₹ {formatPrice(stock.price)}</span>
                <ChangeBadge value={stock.changePct} />
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6B6966]">
                <span className="num">₹{stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}</span>
                <span>·</span>
                <span>As of 3:30 PM, NSE</span>
              </div>
              <button
                onClick={() => setWatchlisted(w => !w)}
                className={cn(
                  'flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-[6px] transition-all',
                  watchlisted
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#4F46E5]'
                    : 'border border-[#E5E4E0] text-[#6B6966] hover:border-[#4F46E5] hover:text-[#4F46E5]'
                )}
              >
                {watchlisted ? <Check size={14} /> : <Plus size={14} />}
                {watchlisted ? 'Watchlisted' : 'Add to Watchlist'}
              </button>
            </div>
          </div>

          {/* 52W Range */}
          <div className="mt-4 max-w-md">
            <div className="flex justify-between text-[11px] text-[#9C9894] mb-1">
              <span>52W Low: <span className="num font-semibold text-[#DC2626]">₹{stock.weekLow52.toLocaleString('en-IN')}</span></span>
              <span>52W High: <span className="num font-semibold text-[#16A34A]">₹{stock.weekHigh52.toLocaleString('en-IN')}</span></span>
            </div>
            <div className="relative h-2 bg-[#F1F0ED] rounded-full">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#4F46E5] rounded-full border-2 border-white shadow"
                style={{ left: `calc(${pricePos}% - 6px)` }}
              />
              <div className="h-full rounded-full bg-gradient-to-r from-[#FEE2E2] via-[#EEF2FF] to-[#DCFCE7]" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-0 border-b border-transparent -mb-px">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-[#4F46E5] text-[#4F46E5]'
                    : 'border-transparent text-[#6B6966] hover:text-[#1A1917]'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* OVERVIEW TAB */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart placeholder */}
            <div className="lg:col-span-2 card p-5">
              <div className="flex items-center gap-2 mb-4">
                {['1D', '1W', '1M', '6M', '1Y', '5Y', 'All'].map(p => (
                  <button key={p} className={cn(
                    'text-xs px-2.5 py-1 rounded transition-colors',
                    p === '1Y' ? 'bg-[#4F46E5] text-white' : 'text-[#6B6966] hover:bg-[#F1F0ED]'
                  )}>{p}</button>
                ))}
              </div>
              <div className="h-64 bg-gradient-to-b from-[#EEF2FF] to-[#F8F7F4] rounded-[8px] flex items-center justify-center text-[#9C9894] text-sm border border-[#E5E4E0]">
                <div className="text-center">
                  <div className="text-2xl mb-2">📈</div>
                  <div>Chart loads with live data integration</div>
                  <div className="text-xs mt-1">(TradingView Lightweight Charts)</div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#EEEDE9]">
                <h3 className="text-xs font-semibold text-[#6B6966] uppercase tracking-wide">Key Metrics</h3>
              </div>
              {[
                { label: 'Market Cap', value: `₹ ${formatCrores(stock.marketCap)}` },
                { label: 'P/E Ratio', value: `${stock.pe}x` },
                { label: 'P/B Ratio', value: `${stock.pb}x` },
                { label: 'EV/EBITDA', value: `${stock.evEbitda}x` },
                { label: 'Dividend Yield', value: `${stock.divYield}%` },
                { label: 'Book Value', value: `₹ ${stock.bookValue.toFixed(2)}` },
                { label: 'EPS (TTM)', value: `₹ ${stock.eps.toFixed(2)}` },
                { label: 'Face Value', value: `₹ ${stock.faceValue}` },
                { label: '52W High', value: `₹ ${stock.weekHigh52.toLocaleString('en-IN')}` },
                { label: '52W Low', value: `₹ ${stock.weekLow52.toLocaleString('en-IN')}` },
                { label: 'Avg Volume', value: stock.avgVolume },
                { label: 'Listed Since', value: stock.listedSince },
              ].map((item, i) => (
                <div key={item.label} className={cn('flex items-center justify-between px-4 py-2.5', i % 2 === 1 ? 'bg-[#FAFAF9]' : '')}>
                  <span className="text-xs text-[#6B6966]">{item.label}</span>
                  <span className="num text-xs font-semibold text-[#1A1917]">{item.value}</span>
                </div>
              ))}
            </div>

            {/* About */}
            <div className="lg:col-span-2 card-plain p-5">
              <h3 className="font-semibold text-[#1A1917] text-sm mb-3">About {symbol}</h3>
              <p className="text-sm text-[#6B6966] leading-relaxed">{stock.about}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#9C9894]">
                <span>Sector: <span className="text-[#1A1917] font-medium">{stock.sector}</span></span>
                <span>Industry: <span className="text-[#1A1917] font-medium">{stock.industry}</span></span>
                <span>Founded: <span className="text-[#1A1917] font-medium">{stock.founded}</span></span>
                <span>Employees: <span className="text-[#1A1917] font-medium">{stock.employees}</span></span>
                <a href={`https://${stock.website}`} target="_blank" rel="noopener noreferrer" className="text-[#4F46E5] flex items-center gap-1 hover:underline">
                  {stock.website} <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* Quick Ratios */}
            <div className="card-plain p-5">
              <h3 className="font-semibold text-[#1A1917] text-sm mb-3">Quick Ratios</h3>
              <div className="space-y-2">
                {[
                  { label: 'ROE', value: `${stock.roe}%`, good: true },
                  { label: 'ROCE', value: `${stock.roce}%`, good: true },
                  { label: 'Net Margin', value: `${stock.netMargin}%`, good: true },
                  { label: 'Debt/Equity', value: `${stock.debtEquity}x`, good: true },
                  { label: 'Current Ratio', value: `${stock.currentRatio}x`, good: true },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-1 border-b border-[#EEEDE9] last:border-0">
                    <span className="text-sm text-[#6B6966]">{r.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="num text-sm font-semibold text-[#1A1917]">{r.value}</span>
                      <span className={cn('text-[10px] w-2 h-2 rounded-full', r.good ? 'bg-[#16A34A]' : 'bg-[#DC2626]')} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FINANCIALS TAB */}
        {activeTab === 'Financials' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-[#F1F0ED] p-1 rounded-[8px]">
                {[['pl', 'Profit & Loss'], ['bs', 'Balance Sheet'], ['cf', 'Cash Flow']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFinTab(key as 'pl' | 'bs' | 'cf')}
                    className={cn(
                      'text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors',
                      finTab === key ? 'bg-white text-[#1A1917] shadow-sm' : 'text-[#6B6966]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 bg-[#F1F0ED] p-1 rounded-[8px]">
                {[['annual', 'Annual'], ['quarterly', 'Quarterly']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFinPeriod(key as 'annual' | 'quarterly')}
                    className={cn(
                      'text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors',
                      finPeriod === key ? 'bg-white text-[#1A1917] shadow-sm' : 'text-[#6B6966]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {finTab === 'pl' && (
              <div className="card p-0 overflow-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {(finPeriod === 'annual' ? stock.financials.annual : stock.financials.quarterly).map(r => {
                        const label = 'year' in r ? r.year : r.period;
                        return <th key={label}>{label}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'revenue', label: 'Revenue (₹ Cr)' },
                      { key: 'revGrowth', label: 'Revenue Growth %', isGrowth: true },
                      { key: 'ebitda', label: 'EBITDA (₹ Cr)' },
                      { key: 'netProfit', label: 'Net Profit (₹ Cr)' },
                      { key: 'profitGrowth', label: 'Profit Growth %', isGrowth: true },
                      { key: 'netMargin', label: 'Net Margin %' },
                      { key: 'eps', label: 'EPS (₹)' },
                    ].map(row => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        {(finPeriod === 'annual' ? stock.financials.annual : stock.financials.quarterly).map((r, i) => {
                          const val = (r as unknown as Record<string, number | null | undefined>)[row.key];
                          if (val === null || val === undefined) return <td key={i} className="text-[#9C9894]">—</td>;
                          if (row.isGrowth) {
                            const pos = (val as number) >= 0;
                            return (
                              <td key={i} className={pos ? 'text-positive' : 'text-negative'}>
                                {pos ? '+' : ''}{(val as number).toFixed(1)}%
                              </td>
                            );
                          }
                          return <td key={i}>{Number(val).toLocaleString('en-IN')}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {finTab === 'bs' && (
              <div className="card p-0 overflow-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {stock.balanceSheet.map(r => <th key={r.year}>{r.year}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'totalAssets', label: 'Total Assets (₹ Cr)' },
                      { key: 'equity', label: 'Total Equity (₹ Cr)' },
                      { key: 'totalDebt', label: 'Total Debt (₹ Cr)' },
                      { key: 'cash', label: 'Cash & Equivalents (₹ Cr)' },
                      { key: 'reserves', label: 'Reserves (₹ Cr)' },
                    ].map(row => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        {stock.balanceSheet.map((r, i) => (
                          <td key={i}>{(r as unknown as Record<string, number>)[row.key].toLocaleString('en-IN')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {finTab === 'cf' && (
              <div className="card p-0 overflow-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {stock.cashflow.map(r => <th key={r.year}>{r.year}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'operating', label: 'Operating CF (₹ Cr)' },
                      { key: 'investing', label: 'Investing CF (₹ Cr)' },
                      { key: 'financing', label: 'Financing CF (₹ Cr)' },
                      { key: 'freeCashFlow', label: 'Free Cash Flow (₹ Cr)' },
                    ].map(row => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        {stock.cashflow.map((r, i) => {
                          const val = (r as unknown as Record<string, number>)[row.key];
                          const pos = val >= 0;
                          return (
                            <td key={i} className={!pos ? 'text-negative' : ''}>
                              {val.toLocaleString('en-IN')}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* RATIOS TAB */}
        {activeTab === 'Ratios' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-[#6B6966] uppercase tracking-wide mb-4">Valuation</h3>
              <RatioRow label="P/E Ratio" value={stock.pe} unit="x" industryAvg={22} />
              <RatioRow label="P/B Ratio" value={stock.pb} unit="x" industryAvg={4.2} />
              <RatioRow label="EV/EBITDA" value={stock.evEbitda} unit="x" industryAvg={14} />
              <RatioRow label="Price/Sales" value={5.2} unit="x" industryAvg={3.1} />
              <RatioRow label="Dividend Yield" value={stock.divYield} unit="%" industryAvg={1.2} />
              <RatioRow label="PEG Ratio" value={stock.pegRatio} unit="x" industryAvg={1.8} inverse />
            </div>

            <div className="card p-5">
              <h3 className="text-xs font-semibold text-[#6B6966] uppercase tracking-wide mb-4">Profitability</h3>
              <RatioRow label="ROE" value={stock.roe} unit="%" industryAvg={18} />
              <RatioRow label="ROCE" value={stock.roce} unit="%" industryAvg={22} />
              <RatioRow label="Net Profit Margin" value={stock.netMargin} unit="%" industryAvg={14} />
              <RatioRow label="Operating Margin" value={stock.opMargin} unit="%" industryAvg={18} />
              <RatioRow label="Asset Turnover" value={1.2} unit="x" industryAvg={0.9} />
            </div>

            <div className="card p-5">
              <h3 className="text-xs font-semibold text-[#6B6966] uppercase tracking-wide mb-4">Financial Health</h3>
              <RatioRow label="Debt to Equity" value={stock.debtEquity} unit="x" industryAvg={0.5} inverse />
              <RatioRow label="Interest Coverage" value={stock.interestCoverage} unit="x" industryAvg={15} />
              <RatioRow label="Current Ratio" value={stock.currentRatio} unit="x" industryAvg={1.5} />
              <RatioRow label="Quick Ratio" value={stock.quickRatio} unit="x" industryAvg={1.2} />
            </div>

            <div className="card p-5">
              <h3 className="text-xs font-semibold text-[#6B6966] uppercase tracking-wide mb-4">Growth (CAGR)</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-[#6B6966] uppercase">
                    <th className="text-left py-2 font-semibold">Metric</th>
                    <th className="text-right py-2 font-semibold">1Y</th>
                    <th className="text-right py-2 font-semibold">3Y</th>
                    <th className="text-right py-2 font-semibold">5Y</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Revenue', y1: 6.8, y3: 14.2, y5: 8.9 },
                    { label: 'Profit', y1: 8.9, y3: 11.2, y5: 7.2 },
                    { label: 'EPS', y1: 9.2, y3: 11.5, y5: 7.5 },
                    { label: 'Stock Price', y1: 12.1, y3: 8.4, y5: 18.2 },
                  ].map(r => (
                    <tr key={r.label} className="border-t border-[#EEEDE9]">
                      <td className="py-2.5 text-[#6B6966] font-sans text-sm">{r.label}</td>
                      {[r.y1, r.y3, r.y5].map((v, i) => (
                        <td key={i} className={cn('num py-2.5 text-right text-sm font-semibold', v >= 0 ? 'text-positive' : 'text-negative')}>
                          {v >= 0 ? '+' : ''}{v}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SHAREHOLDING TAB */}
        {activeTab === 'Shareholding' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <h3 className="font-semibold text-[#1A1917] text-sm mb-5">Current Shareholding (Dec 2024)</h3>
              <div className="space-y-4">
                {[
                  { label: 'Promoters', value: stock.promoterPct, color: '#4F46E5' },
                  { label: 'FII / FPI', value: stock.fiiPct, color: '#16A34A' },
                  { label: 'DII', value: stock.diiPct, color: '#D97706' },
                  { label: 'Public', value: stock.publicPct, color: '#9C9894' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                        <span className="text-sm text-[#6B6966]">{item.label}</span>
                      </div>
                      <span className="num text-sm font-semibold text-[#1A1917]">{item.value.toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-[#F1F0ED] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-[#EEEDE9] flex items-center justify-between">
                <span className="text-sm text-[#6B6966]">Promoter Pledge</span>
                {stock.pledgePct === 0
                  ? <span className="text-xs font-semibold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded">✓ No Pledge</span>
                  : <span className="text-xs font-semibold text-[#D97706] bg-[#FEF3C7] px-2.5 py-1 rounded">⚠ {stock.pledgePct}% Pledged</span>
                }
              </div>
            </div>

            <div className="card p-0 overflow-auto">
              <div className="px-5 py-4 border-b border-[#EEEDE9]">
                <h3 className="font-semibold text-[#1A1917] text-sm">Shareholding Trend</h3>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Holder</th>
                    {stock.shareholding.map(s => <th key={s.quarter}>{s.quarter}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['promoter', 'fii', 'dii', 'public'].map(key => (
                    <tr key={key}>
                      <td className="capitalize">{key === 'fii' ? 'FII/FPI' : key === 'dii' ? 'DII' : key}</td>
                      {stock.shareholding.map((s, i) => (
                        <td key={i}>{(s as unknown as Record<string, number>)[key].toFixed(2)}%</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 text-xs text-[#9C9894] border-t border-[#EEEDE9]">
                No. of shareholders: 38,24,112
              </div>
            </div>
          </div>
        )}

        {/* PEERS TAB */}
        {activeTab === 'Peers' && (
          <div className="card p-0 overflow-auto">
            <div className="px-5 py-4 border-b border-[#EEEDE9]">
              <h3 className="font-semibold text-[#1A1917] text-sm">Peer Comparison — IT Services</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Price (₹)</th>
                  <th>Mkt Cap</th>
                  <th>P/E</th>
                  <th>P/B</th>
                  <th>ROE %</th>
                  <th>Rev Gr 1Y</th>
                </tr>
              </thead>
              <tbody>
                {PEERS.map(p => (
                  <tr
                    key={p.symbol}
                    className={p.active ? 'bg-[#EEF2FF]' : ''}
                    onClick={() => !p.active && window.location.assign(`/stocks/${p.symbol}`)}
                    style={{ cursor: p.active ? 'default' : 'pointer' }}
                  >
                    <td>
                      <span className={cn('font-semibold', p.active ? 'text-[#4F46E5]' : 'text-[#1A1917]')}>
                        {p.symbol}
                      </span>
                      {p.active && <span className="ml-1.5 text-[10px] text-[#4F46E5] bg-[#EEF2FF] px-1.5 py-0.5 rounded">Current</span>}
                    </td>
                    <td>₹ {p.price.toLocaleString('en-IN')}</td>
                    <td>{p.mcap}</td>
                    <td>{p.pe}x</td>
                    <td>{p.pb}x</td>
                    <td className={p.roe > 20 ? 'text-positive' : ''}>{p.roe}%</td>
                    <td className={p.revGrowth >= 0 ? 'text-positive' : 'text-negative'}>{p.revGrowth >= 0 ? '+' : ''}{p.revGrowth}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
