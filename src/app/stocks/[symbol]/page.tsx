'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { cn, formatPrice, formatCrores } from '@/lib/utils';
import PriceChart from '@/components/charts/PriceChart';
import { STOCK_TCS, PEERS } from '@/lib/mock-data';

const TABS = ['Overview', 'Financials', 'Ratios', 'Shareholding', 'Peers'] as const;
type Tab = typeof TABS[number];

interface StockData {
  company: {
    symbol: string; name: string; sector: string; industry: string; bse_code: string;
  };
  quote: {
    price: number; change: number; change_pct: number;
    open: number; high: number; low: number; prev_close: number; volume: number;
  };
  ratios: {
    pe: number; pb: number; ev_ebitda: number; dividend_yield: number; peg_ratio: number;
    roe: number; roce: number; net_margin: number; operating_margin: number;
    debt_to_equity: number; current_ratio: number; quick_ratio: number;
    market_cap: number; week_high_52: number; week_low_52: number;
    eps: number; revenue_growth_1y: number; profit_growth_1y: number;
    revenue_growth_3y: number; profit_growth_3y: number; eps_growth_1y: number;
  };
  financials: {
    annual: Array<Record<string, unknown>>;
    quarterly: Array<Record<string, unknown>>;
  };
  shareholding: Array<{
    quarter: string; promoter_pct: number; fii_pct: number; dii_pct: number;
    public_pct: number; pledge_pct: number;
  }>;
  peers?: typeof PEERS;
}

function ChangeBadge({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded text-sm font-mono font-semibold', pos ? 'badge-positive' : 'badge-negative')}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function RatioRow({ label, value, unit = '' }: {
  label: string; value: number | null | undefined; unit?: string;
}) {
  return (
    <div className="py-3 border-b border-[#EDF0F7] last:border-0 flex items-center justify-between">
      <span className="text-sm text-[#4A5568]">{label}</span>
      <span className="num text-sm font-semibold text-[#0D1117]">
        {value === null || value === undefined ? <span className="text-[#8A96A8]">—</span> : `${value.toFixed(1)}${unit}`}
      </span>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#EEF1F7] rounded', className)} />;
}

export default function StockPage() {
  const params = useParams();
  const symbol = (params.symbol as string).toUpperCase();

  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [watchlisted, setWatchlisted] = useState(false);
  const [finPeriod, setFinPeriod] = useState<'annual' | 'quarterly'>('annual');
  const [finTab, setFinTab] = useState<'pl' | 'bs' | 'cf'>('pl');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stocks/${symbol}`)
      .then(r => r.json())
      .then(d => {
        if (d?.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        // Construct fallback from mock
        setData({
          company: { symbol, name: STOCK_TCS.name, sector: STOCK_TCS.sector, industry: STOCK_TCS.industry, bse_code: STOCK_TCS.bse },
          quote: { price: STOCK_TCS.price, change: STOCK_TCS.change, change_pct: STOCK_TCS.changePct, open: STOCK_TCS.open, high: STOCK_TCS.high, low: STOCK_TCS.low, prev_close: STOCK_TCS.prevClose, volume: 38400000 },
          ratios: { pe: STOCK_TCS.pe, pb: STOCK_TCS.pb, ev_ebitda: STOCK_TCS.evEbitda, dividend_yield: STOCK_TCS.divYield, peg_ratio: STOCK_TCS.pegRatio, roe: STOCK_TCS.roe, roce: STOCK_TCS.roce, net_margin: STOCK_TCS.netMargin, operating_margin: STOCK_TCS.opMargin, debt_to_equity: STOCK_TCS.debtEquity, current_ratio: STOCK_TCS.currentRatio, quick_ratio: STOCK_TCS.quickRatio, market_cap: STOCK_TCS.marketCap, week_high_52: STOCK_TCS.weekHigh52, week_low_52: STOCK_TCS.weekLow52, eps: STOCK_TCS.eps, revenue_growth_1y: 6.8, profit_growth_1y: 8.9, revenue_growth_3y: 14.2, profit_growth_3y: 11.2, eps_growth_1y: 9.2 },
          financials: STOCK_TCS.financials as unknown as StockData['financials'],
          shareholding: STOCK_TCS.shareholding.map(s => ({ quarter: s.quarter, promoter_pct: s.promoter, fii_pct: s.fii, dii_pct: s.dii, public_pct: s.public, pledge_pct: 0 })) as StockData['shareholding'],
          peers: PEERS,
        });
        setLoading(false);
      });
  }, [symbol]);

  const q = data?.quote;
  const r = data?.ratios;
  const c = data?.company;

  const weekHigh = r?.week_high_52 ?? 0;
  const weekLow = r?.week_low_52 ?? 0;
  const price = q?.price ?? 0;
  const range52w = weekHigh - weekLow;
  const pricePos = range52w > 0 ? Math.min(((price - weekLow) / range52w) * 100, 100) : 50;

  const annualFin = data?.financials?.annual ?? [];
  const quarterlyFin = data?.financials?.quarterly ?? [];
  const finData = finPeriod === 'annual' ? annualFin : quarterlyFin;

  // Detect field names (API vs mock data have slightly different keys)
  const periodKey = finData[0] && ('year' in finData[0] ? 'year' : 'period');
  const revKey = finData[0] && ('revenue' in finData[0] ? 'revenue' : 'rev');
  const npKey = 'net_profit' in (finData[0] ?? {}) ? 'net_profit' : 'netProfit';

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#4A5568] hover:text-[#0D1117] mb-4 transition-colors">
            <ArrowLeft size={14} /> Back
          </Link>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-10 w-40" />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="text-2xl font-bold text-[#0D1117]">{symbol}</h1>
                  {c?.sector && (
                    <span className="text-[11px] bg-[#FFF7ED] text-[#F97316] px-2 py-0.5 rounded font-medium">{c.sector}</span>
                  )}
                </div>
                <p className="text-[#4A5568] text-sm mb-1">{c?.name}</p>
                <p className="text-[11px] text-[#8A96A8]">
                  NSE: {symbol}
                  {c?.bse_code && ` · BSE: ${c.bse_code}`}
                  {c?.industry && ` · ${c.industry}`}
                </p>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="flex items-center gap-3">
                  <span className="num text-3xl font-bold text-[#0D1117]">
                    ₹ {formatPrice(q?.price ?? 0)}
                  </span>
                  <ChangeBadge value={q?.change_pct ?? 0} />
                </div>
                <div className="text-sm text-[#4A5568] flex items-center gap-2">
                  <span className="num">{(q?.change ?? 0) >= 0 ? '+' : ''}₹{(q?.change ?? 0).toFixed(2)}</span>
                  <span>·</span>
                  <span>At last market close · NSE</span>
                </div>
                <button
                  onClick={() => setWatchlisted(w => !w)}
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-[6px] transition-all',
                    watchlisted
                      ? 'bg-[#FFF7ED] text-[#F97316] border border-[#F97316]'
                      : 'border border-[#E2E8F0] text-[#4A5568] hover:border-[#F97316] hover:text-[#F97316]'
                  )}
                >
                  {watchlisted ? <Check size={14} /> : <Plus size={14} />}
                  {watchlisted ? 'Watchlisted' : 'Add to Watchlist'}
                </button>
              </div>
            </div>
          )}

          {/* 52W Range */}
          {!loading && weekHigh > 0 && weekLow > 0 && (
            <div className="mt-4 max-w-md">
              <div className="flex justify-between text-[11px] text-[#8A96A8] mb-1.5">
                <span>52W Low: <span className="num font-semibold text-[#DC2626]">₹{formatPrice(weekLow)}</span></span>
                <span>52W High: <span className="num font-semibold text-[#16A34A]">₹{formatPrice(weekHigh)}</span></span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-[#FEE2E2] via-[#FFF7ED] to-[#DCFCE7]">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#F97316] rounded-full border-2 border-white shadow-sm"
                  style={{ left: `calc(${pricePos}% - 6px)` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex -mb-px overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 sm:px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-[#4A5568] hover:text-[#0D1117]'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* OVERVIEW */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              {loading
                ? <div className="card p-5"><Skeleton className="h-72 w-full" /></div>
                : <PriceChart symbol={symbol} currentPrice={price} />
              }
            </div>

            {/* Key Metrics */}
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#EDF0F7]">
                <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide">Key Metrics</h3>
              </div>
              {loading ? (
                <div className="p-4 space-y-3">{Array(12).fill(0).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
              ) : (
                [
                  { label: 'Market Cap', value: r?.market_cap ? `₹ ${formatCrores(r.market_cap)}` : '—' },
                  { label: 'P/E Ratio', value: r?.pe ? `${r.pe.toFixed(1)}x` : '—' },
                  { label: 'P/B Ratio', value: r?.pb ? `${r.pb.toFixed(1)}x` : '—' },
                  { label: 'EV/EBITDA', value: r?.ev_ebitda ? `${r.ev_ebitda.toFixed(1)}x` : '—' },
                  { label: 'Dividend Yield', value: r?.dividend_yield ? `${r.dividend_yield.toFixed(2)}%` : '—' },
                  { label: 'EPS (TTM)', value: r?.eps ? `₹ ${r.eps.toFixed(2)}` : '—' },
                  { label: '52W High', value: weekHigh ? `₹ ${formatPrice(weekHigh)}` : '—' },
                  { label: '52W Low', value: weekLow ? `₹ ${formatPrice(weekLow)}` : '—' },
                  { label: "Today's Open", value: q?.open ? `₹ ${formatPrice(q.open)}` : '—' },
                  { label: "Today's High", value: q?.high ? `₹ ${formatPrice(q.high)}` : '—' },
                  { label: "Today's Low", value: q?.low ? `₹ ${formatPrice(q.low)}` : '—' },
                  { label: 'Prev Close', value: q?.prev_close ? `₹ ${formatPrice(q.prev_close)}` : '—' },
                ].map((item, i) => (
                  <div key={item.label} className={cn('flex items-center justify-between px-4 py-2.5', i % 2 === 1 ? 'bg-[#FAFBFD]' : '')}>
                    <span className="text-xs text-[#4A5568]">{item.label}</span>
                    <span className="num text-xs font-semibold text-[#0D1117]">{item.value}</span>
                  </div>
                ))
              )}
            </div>

            {/* About */}
            <div className="lg:col-span-2 card-plain p-5">
              <h3 className="font-semibold text-[#0D1117] text-sm mb-3">About {symbol}</h3>
              {loading
                ? <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-3/4" /></div>
                : <p className="text-sm text-[#4A5568] leading-relaxed">
                    {c?.name} is listed on the NSE under symbol {symbol}
                    {c?.sector && ` in the ${c.sector} sector`}
                    {c?.industry && `, ${c.industry} industry`}.
                  </p>
              }
              {!loading && (
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#8A96A8]">
                  {c?.sector && <span>Sector: <span className="text-[#0D1117] font-medium">{c.sector}</span></span>}
                  {c?.industry && <span>Industry: <span className="text-[#0D1117] font-medium">{c.industry}</span></span>}
                  {c?.bse_code && <span>BSE: <span className="text-[#0D1117] font-medium">{c.bse_code}</span></span>}
                </div>
              )}
            </div>

            {/* Quick Ratios */}
            <div className="card-plain p-5">
              <h3 className="font-semibold text-[#0D1117] text-sm mb-3">Quick Ratios</h3>
              {loading
                ? <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
                : [
                    { label: 'ROE', value: r?.roe ? `${r.roe.toFixed(1)}%` : '—', good: (r?.roe ?? 0) > 15 },
                    { label: 'ROCE', value: r?.roce ? `${r.roce.toFixed(1)}%` : '—', good: (r?.roce ?? 0) > 15 },
                    { label: 'Net Margin', value: r?.net_margin ? `${r.net_margin.toFixed(1)}%` : '—', good: (r?.net_margin ?? 0) > 10 },
                    { label: 'Debt/Equity', value: r?.debt_to_equity !== undefined ? `${r.debt_to_equity.toFixed(2)}x` : '—', good: (r?.debt_to_equity ?? 999) < 1 },
                    { label: 'Current Ratio', value: r?.current_ratio ? `${r.current_ratio.toFixed(2)}x` : '—', good: (r?.current_ratio ?? 0) > 1.5 },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-[#EDF0F7] last:border-0">
                      <span className="text-sm text-[#4A5568]">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="num text-sm font-semibold text-[#0D1117]">{row.value}</span>
                        <span className={cn('w-2 h-2 rounded-full', row.good ? 'bg-[#16A34A]' : 'bg-[#DC2626]')} />
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* FINANCIALS */}
        {activeTab === 'Financials' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-1 bg-[#EEF1F7] p-1 rounded-[8px]">
                {[['pl', 'Profit & Loss'], ['bs', 'Balance Sheet'], ['cf', 'Cash Flow']].map(([key, label]) => (
                  <button key={key} onClick={() => setFinTab(key as 'pl' | 'bs' | 'cf')}
                    className={cn('text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors', finTab === key ? 'bg-white text-[#0D1117] shadow-sm' : 'text-[#4A5568]')}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 bg-[#EEF1F7] p-1 rounded-[8px]">
                {[['annual', 'Annual'], ['quarterly', 'Quarterly']].map(([key, label]) => (
                  <button key={key} onClick={() => setFinPeriod(key as 'annual' | 'quarterly')}
                    className={cn('text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors', finPeriod === key ? 'bg-white text-[#0D1117] shadow-sm' : 'text-[#4A5568]')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="card p-5 space-y-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : finData.length === 0 ? (
              <div className="card p-12 text-center text-[#8A96A8]">No financial data available yet</div>
            ) : (
              <div className="card p-0 overflow-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {finData.map((row, i) => (
                        <th key={i}>{String(row[periodKey as string] ?? row.period ?? row.year ?? `P${i+1}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {finTab === 'pl' && [
                      { key: revKey, label: 'Revenue (₹ Cr)', format: 'crore' },
                      { key: 'revGrowth', label: 'Rev Growth %', format: 'growth' },
                      { key: 'ebitda', label: 'EBITDA (₹ Cr)', format: 'crore' },
                      { key: npKey, label: 'Net Profit (₹ Cr)', format: 'crore' },
                      { key: 'profitGrowth', label: 'Profit Growth %', format: 'growth' },
                      { key: 'netMargin', label: 'Net Margin %', format: 'pct' },
                      { key: 'eps', label: 'EPS (₹)', format: 'plain' },
                    ].map(row => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        {finData.map((r, i) => {
                          const val = (r as Record<string, unknown>)[row.key];
                          if (val === null || val === undefined) return <td key={i} className="text-[#8A96A8]">—</td>;
                          const num = Number(val);
                          if (row.format === 'growth') {
                            const pos = num >= 0;
                            return <td key={i} className={pos ? 'text-positive' : 'text-negative'}>{pos ? '+' : ''}{num.toFixed(1)}%</td>;
                          }
                          if (row.format === 'pct') return <td key={i}>{num.toFixed(1)}%</td>;
                          if (row.format === 'crore') return <td key={i}>{num.toLocaleString('en-IN')}</td>;
                          return <td key={i}>{num.toFixed(2)}</td>;
                        })}
                      </tr>
                    ))}
                    {finTab === 'bs' && [
                      { key: 'total_assets', label: 'Total Assets (₹ Cr)' },
                      { key: 'total_equity', label: 'Total Equity (₹ Cr)' },
                      { key: 'total_debt', label: 'Total Debt (₹ Cr)' },
                      { key: 'cash', label: 'Cash & Equivalents (₹ Cr)' },
                    ].map(row => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        {finData.map((r, i) => {
                          const val = Number((r as Record<string, unknown>)[row.key] ?? 0);
                          return <td key={i}>{val ? val.toLocaleString('en-IN') : '—'}</td>;
                        })}
                      </tr>
                    ))}
                    {finTab === 'cf' && [
                      { key: 'operating_cashflow', label: 'Operating CF (₹ Cr)' },
                      { key: 'investing_cashflow', label: 'Investing CF (₹ Cr)' },
                      { key: 'financing_cashflow', label: 'Financing CF (₹ Cr)' },
                      { key: 'free_cashflow', label: 'Free Cash Flow (₹ Cr)' },
                    ].map(row => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        {finData.map((r, i) => {
                          const val = Number((r as Record<string, unknown>)[row.key] ?? 0);
                          return <td key={i} className={val < 0 ? 'text-negative' : ''}>{val ? val.toLocaleString('en-IN') : '—'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* RATIOS */}
        {activeTab === 'Ratios' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-4">Valuation</h3>
              <RatioRow label="P/E Ratio" value={r?.pe} unit="x" />
              <RatioRow label="P/B Ratio" value={r?.pb} unit="x" />
              <RatioRow label="EV/EBITDA" value={r?.ev_ebitda} unit="x" />
              <RatioRow label="Dividend Yield" value={r?.dividend_yield} unit="%" />
              <RatioRow label="PEG Ratio" value={r?.peg_ratio} unit="x" />
            </div>
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-4">Profitability</h3>
              <RatioRow label="ROE" value={r?.roe} unit="%" />
              <RatioRow label="ROCE" value={r?.roce} unit="%" />
              <RatioRow label="Net Profit Margin" value={r?.net_margin} unit="%" />
              <RatioRow label="Operating Margin" value={r?.operating_margin} unit="%" />
            </div>
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-4">Financial Health</h3>
              <RatioRow label="Debt to Equity" value={r?.debt_to_equity} unit="x" />
              <RatioRow label="Current Ratio" value={r?.current_ratio} unit="x" />
              <RatioRow label="Quick Ratio" value={r?.quick_ratio} unit="x" />
            </div>
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-4">Growth (CAGR)</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-[#4A5568] uppercase">
                    <th className="text-left py-2 font-semibold">Metric</th>
                    <th className="text-right py-2 font-semibold">1Y</th>
                    <th className="text-right py-2 font-semibold">3Y</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Revenue', y1: r?.revenue_growth_1y, y3: r?.revenue_growth_3y },
                    { label: 'Profit', y1: r?.profit_growth_1y, y3: r?.profit_growth_3y },
                    { label: 'EPS', y1: r?.eps_growth_1y, y3: null },
                  ].map(row => (
                    <tr key={row.label} className="border-t border-[#EDF0F7]">
                      <td className="py-2.5 text-[#4A5568] font-sans text-sm">{row.label}</td>
                      {[row.y1, row.y3].map((v, i) => (
                        <td key={i} className={cn('num py-2.5 text-right text-sm font-semibold', v == null ? 'text-[#8A96A8]' : v >= 0 ? 'text-positive' : 'text-negative')}>
                          {v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SHAREHOLDING */}
        {activeTab === 'Shareholding' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <h3 className="font-semibold text-[#0D1117] text-sm mb-5">
                Latest Shareholding {data?.shareholding?.[0]?.quarter ? `(${data.shareholding[0].quarter})` : ''}
              </h3>
              {loading ? (
                <div className="space-y-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : !data?.shareholding?.length ? (
                <div className="py-10 text-center text-[#8A96A8] text-sm">
                  Shareholding data not yet available.
                  <br />
                  <span className="text-xs mt-1 block">Updated quarterly from regulatory filings.</span>
                </div>
              ) : (
                <>
                  {[
                    { label: 'Promoters', key: 'promoter_pct', color: '#F97316' },
                    { label: 'FII / FPI', key: 'fii_pct', color: '#16A34A' },
                    { label: 'DII', key: 'dii_pct', color: '#D97706' },
                    { label: 'Public', key: 'public_pct', color: '#8A96A8' },
                  ].map(item => {
                    const val = data?.shareholding?.[0]?.[item.key as keyof typeof data.shareholding[0]] ?? 0;
                    return (
                      <div key={item.label} className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                            <span className="text-sm text-[#4A5568]">{item.label}</span>
                          </div>
                          <span className="num text-sm font-semibold text-[#0D1117]">{Number(val).toFixed(2)}%</span>
                        </div>
                        <div className="h-2 bg-[#EEF1F7] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${val}%`, background: item.color }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 pt-4 border-t border-[#EDF0F7] flex items-center justify-between">
                    <span className="text-sm text-[#4A5568]">Promoter Pledge</span>
                    {(data?.shareholding?.[0]?.pledge_pct ?? 0) === 0
                      ? <span className="text-xs font-semibold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded">✓ No Pledge</span>
                      : <span className="text-xs font-semibold text-[#D97706] bg-[#FEF3C7] px-2.5 py-1 rounded">⚠ {data?.shareholding?.[0]?.pledge_pct}% Pledged</span>
                    }
                  </div>
                </>
              )}
            </div>

            <div className="card p-0 overflow-auto">
              <div className="px-5 py-4 border-b border-[#EDF0F7]">
                <h3 className="font-semibold text-[#0D1117] text-sm">Shareholding Trend</h3>
              </div>
              {!data?.shareholding?.length ? (
                <div className="p-10 text-center text-[#8A96A8] text-sm">No trend data available yet.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Holder</th>
                      {data?.shareholding.map(s => <th key={s.quarter}>{s.quarter}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Promoters', key: 'promoter_pct' },
                      { label: 'FII/FPI', key: 'fii_pct' },
                      { label: 'DII', key: 'dii_pct' },
                      { label: 'Public', key: 'public_pct' },
                    ].map(row => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        {data?.shareholding.map((s, i) => (
                          <td key={i}>{Number(s[row.key as keyof typeof s] ?? 0).toFixed(2)}%</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* PEERS */}
        {activeTab === 'Peers' && (
          <div className="card p-0 overflow-auto">
            <div className="px-5 py-4 border-b border-[#EDF0F7] flex items-center justify-between">
              <h3 className="font-semibold text-[#0D1117] text-sm">
                Peer Comparison — {c?.sector ?? 'Sector'}
              </h3>
              <div className="flex items-center gap-1 text-xs text-[#8A96A8]">
                <RefreshCw size={11} /> Latest close
              </div>
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
                {(data?.peers ?? PEERS).length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-[#8A96A8] font-sans">No peer data available for this sector.</td></tr>
                ) : (data?.peers ?? PEERS).map(p => (
                  <tr
                    key={p.symbol}
                    className={p.symbol === symbol ? 'bg-[#FFF7ED]' : ''}
                    onClick={() => p.symbol !== symbol && window.location.assign(`/stocks/${p.symbol}`)}
                    style={{ cursor: p.symbol === symbol ? 'default' : 'pointer' }}
                  >
                    <td>
                      <span className={cn('font-semibold', p.symbol === symbol ? 'text-[#F97316]' : 'text-[#0D1117]')}>
                        {p.symbol}
                      </span>
                      {p.symbol === symbol && <span className="ml-1.5 text-[10px] text-[#F97316] bg-[#FFF7ED] px-1.5 py-0.5 rounded">Current</span>}
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
