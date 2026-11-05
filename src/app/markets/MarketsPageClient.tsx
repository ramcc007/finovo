'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TickerBar from '@/components/layout/TickerBar';
import AuthGate from '@/components/auth/AuthGate';
import { cn, formatPrice, formatVolume, formatCrores, formatTradeDate, freshnessLabel } from '@/lib/utils';

// Maps a sector's average day-change % to a heatmap tile color — green for
// gains, red for losses, intensity scaled to ±3% (a "big" day for a sector).
function heatColor(change: number): { bg: string; text: string } {
  const clamped = Math.max(-3, Math.min(3, change));
  const intensity = Math.abs(clamped) / 3;
  const strong = intensity > 0.6;
  return change >= 0
    ? { bg: `rgba(22,163,74,${0.10 + intensity * 0.65})`, text: strong ? '#fff' : '#14532D' }
    : { bg: `rgba(220,38,38,${0.10 + intensity * 0.65})`, text: strong ? '#fff' : '#7F1D1D' };
}

type IndexTab = 'sensex' | 'nifty50' | 'midcap100' | 'smallcap100';
type MarketTab = IndexTab | 'gainers' | 'losers' | 'active' | 'high52' | 'low52';
const INDEX_KEYS: IndexTab[] = ['sensex', 'nifty50', 'midcap100', 'smallcap100'];
const isIndexTab = (t: MarketTab): t is IndexTab => (INDEX_KEYS as string[]).includes(t);

interface Mover {
  symbol: string; name: string; sector: string | null;
  price: number | null; change: number | null; change_pct: number | null;
  volume: number | null; market_cap: number | null;
}
interface IndexTabData {
  rows: Mover[]; total: number; live: number;
  level: { last: number; change: number | null; change_pct: number | null } | null;
}
interface MarketsData {
  tradeDate: string | null;
  indexTabs?: Partial<Record<IndexTab, IndexTabData>>;
  updatedAt?: string | null;
  total: number;
  gainers: Mover[]; losers: Mover[]; active: Mover[]; high52: Mover[]; low52: Mover[];
  sectors: { name: string; change: number; count: number }[];
  breadth: { advances: number; declines: number; unchanged: number; high52: number; low52: number };
}

const INDEX_TAB_LIST: { key: MarketTab; label: string; short: string }[] = [
  { key: 'sensex', label: 'Sensex 30', short: 'Sensex' },
  { key: 'nifty50', label: 'Nifty 50', short: 'Nifty 50' },
  { key: 'midcap100', label: 'Midcap 100', short: 'Midcap' },
  { key: 'smallcap100', label: 'Smallcap 100', short: 'Smallcap' },
];
const TABS: { key: MarketTab; label: string; short: string }[] = [
  { key: 'gainers', label: 'Top Gainers', short: 'Gainers' },
  { key: 'losers', label: 'Top Losers', short: 'Losers' },
  { key: 'active', label: 'Most Active', short: 'Active' },
  { key: 'high52', label: '52W High', short: '52W High' },
  { key: 'low52', label: '52W Low', short: '52W Low' },
];

function MarketsPageContent() {
  const [tab, setTab] = useState<MarketTab>('sensex');
  const [expanded, setExpanded] = useState(false); // phones: index lists show 15 rows until expanded
  const [mkt, setMkt] = useState<MarketsData | null>(null);
  const [mktLabel, setMktLabel] = useState('');
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    fetch('/api/markets')
      .then(r => r.json())
      .then(d => { if (alive) { setMkt(d); setMktLabel(d?.updatedAt ? freshnessLabel(d.updatedAt) : ''); } })
      .catch(() => { if (alive) setMkt(null); });
    return () => { alive = false; };
  }, []);

  const idx = isIndexTab(tab) ? mkt?.indexTabs?.[tab] ?? null : null;
  const rows: Mover[] | null = mkt ? (isIndexTab(tab) ? idx?.rows ?? [] : mkt[tab]) : null;
  const breadth = mkt?.breadth;
  const total = breadth ? Math.max(breadth.advances + breadth.declines + breadth.unchanged, 1) : 1;

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <TickerBar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-6">
        <div>
          <h1 className="h-section text-[#0D1117]">Market Overview</h1>
          <p className="text-sm text-[#4A5568] mt-1.5">
            {mktLabel
              ? <span className="font-medium text-[#0D1117]">{mktLabel}</span>
              : mkt?.tradeDate
                ? <>Official NSE close · as of <span className="font-medium text-[#0D1117]">{formatTradeDate(mkt.tradeDate)}</span></>
                : 'Updating…'}
            {mkt && mkt.total > 0 ? <> · {mkt.total.toLocaleString('en-IN')} stocks tracked</> : null}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main table */}
          <div className="lg:col-span-2 card-plain p-0 overflow-hidden">
            <div className="px-4 pt-3 pb-3 border-b border-[#EDF0F7] space-y-2">
              {[{ label: 'Indices', list: INDEX_TAB_LIST }, { label: 'Movers', list: TABS }].map(group => (
                <div key={group.label} className="flex items-center gap-3">
                  <span className="hidden sm:block w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#8A96A8]">{group.label}</span>
                  <div role="tablist" aria-label={group.label} className="flex w-full sm:w-auto items-center gap-0.5 bg-[#EEF1F7] p-0.5 rounded-lg">
                    {group.list.map(t => (
                      <button
                        key={t.key}
                        role="tab"
                        aria-selected={tab === t.key}
                        onClick={() => { setTab(t.key); setExpanded(false); }}
                        className={cn(
                          'flex-1 sm:flex-none min-h-9 text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-md transition-all whitespace-nowrap',
                          tab === t.key ? 'bg-white text-[#0D1117] shadow-sm' : 'text-[#4A5568] hover:text-[#0D1117]'
                        )}
                      >
                        <span className="sm:hidden">{t.short}</span><span className="hidden sm:inline">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {idx && (
              <div className="px-4 py-2.5 border-b border-[#EDF0F7] flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#4A5568]">
                {idx.level && (
                  <span className="inline-flex items-center gap-2">
                    <span className="num font-semibold text-[#0D1117] text-sm">{idx.level.last.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {idx.level.change_pct != null && (
                      <span className={cn('num font-semibold', idx.level.change_pct >= 0 ? 'text-positive' : 'text-negative')}>
                        {idx.level.change_pct >= 0 ? '▲' : '▼'} {Math.abs(idx.level.change_pct).toFixed(2)}%
                      </span>
                    )}
                  </span>
                )}
                <span>{idx.rows.length} of {idx.total} stocks, largest first</span>
                {idx.live < idx.rows.length && <span className="text-[#8A96A8]">{idx.live} updated in the latest session</span>}
              </div>
            )}
            {/* Index tabs list up to 100 stocks: scroll inside the card with a pinned header so the page stays a sensible height. */}
            <div className={cn('sm:overflow-x-auto', idx && 'md:overflow-y-auto md:max-h-[70vh] md:[&_th]:sticky md:[&_th]:top-0 md:[&_th]:z-10')}>
              <table className="data-table sm:min-w-[640px]">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Price (₹)</th>
                    <th className="hidden sm:table-cell">Change</th>
                    <th>% Change</th>
                    <th className="hidden sm:table-cell">Volume</th>
                    <th className="hidden sm:table-cell">Mkt Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {!rows ? (
                    Array(10).fill(0).map((_, i) => (
                      <tr key={i}>{Array(6).fill(0).map((_, j) => (
                        <td key={j} className={j === 2 || j === 4 || j === 5 ? 'hidden sm:table-cell' : undefined}><div className="h-4 bg-[#EEF1F7] rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-[#8A96A8] font-sans">
                      {isIndexTab(tab) ? 'This index list is being set up. Check back soon.' : 'Market data is updating. Check back after the next market close.'}
                    </td></tr>
                  ) : rows.map((s, n) => (
                    <tr key={s.symbol} className={cn('group cursor-pointer', idx && n >= 15 && !expanded && 'hidden md:table-row')} onClick={() => router.push(`/stocks/${s.symbol}`)}>
                      <td>
                        <Link href={`/stocks/${s.symbol}`} onClick={e => e.stopPropagation()} className="block font-semibold text-[#0D1117] group-hover:text-[#F97316] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F97316] rounded">{s.symbol}</Link>
                        <div className="text-[11px] text-[#8A96A8] font-sans mt-0.5 max-w-[200px] truncate">{s.name}</div>
                      </td>
                      <td>{s.price != null ? formatPrice(s.price) : '—'}</td>
                      <td className={cn('hidden sm:table-cell', s.change == null ? 'text-[#8A96A8]' : s.change >= 0 ? 'text-positive' : 'text-negative')}>
                        {s.change == null ? '—' : `${s.change >= 0 ? '+' : '−'}₹${Math.abs(s.change).toFixed(2)}`}
                      </td>
                      <td>
                        {s.change_pct == null ? '—' : (
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold whitespace-nowrap', s.change_pct >= 0 ? 'badge-positive' : 'badge-negative')}>
                            {s.change_pct >= 0 ? '▲' : '▼'} {Math.abs(s.change_pct).toFixed(2)}%
                          </span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell text-[#4A5568]">{formatVolume(s.volume)}</td>
                      <td className="hidden sm:table-cell text-[#4A5568]">{s.market_cap != null ? formatCrores(s.market_cap) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {idx && !expanded && idx.rows.length > 15 && (
              <button type="button" onClick={() => setExpanded(true)} className="md:hidden w-full border-t border-[#EDF0F7] py-3 text-sm font-semibold text-[#EA580C] hover:bg-[#FFF7ED]">
                Show all {idx.rows.length} stocks
              </button>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sector Performance */}
            <div className="card-plain p-6">
              <h3 className="text-sm font-semibold text-[#0D1117] mb-4">Sector Performance</h3>
              {!mkt ? (
                <div className="space-y-2.5">{Array(6).fill(0).map((_, i) => <div key={i} className="h-5 bg-[#EEF1F7] rounded animate-pulse" />)}</div>
              ) : mkt.sectors.length === 0 ? (
                <p className="text-sm text-[#8A96A8]">Updating.</p>
              ) : (
                <div className="space-y-2.5">
                  {(mkt.sectors.length > 10 ? [...mkt.sectors.slice(0, 5), ...mkt.sectors.slice(-5)] : mkt.sectors).map(s => {
                    const pos = s.change >= 0;
                    const barWidth = Math.min(Math.abs(s.change) / 2 * 100, 100);
                    return (
                      <div key={s.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#4A5568] truncate pr-2">{s.name}</span>
                          <span className={cn('num text-xs font-semibold shrink-0', pos ? 'text-positive' : 'text-negative')}>
                            {pos ? '+' : ''}{s.change.toFixed(2)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#EEF1F7] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${barWidth}%`, background: pos ? '#16A34A' : '#DC2626' }} />
                        </div>
                      </div>
                    );
                  })}
                  {mkt.sectors.length > 10 && (
                    <a href="#sector-heatmap" className="block pt-1 text-xs font-semibold text-[#EA580C] hover:underline">
                      Strongest 5 and weakest 5 of {mkt.sectors.length} sectors. See all in the heatmap
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Market Breadth */}
            <div className="card-plain p-6">
              <h3 className="text-sm font-semibold text-[#0D1117] mb-4">Market Breadth</h3>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center mb-4">
                {[
                  { label: 'Advancing', value: breadth?.advances, color: '#16A34A' },
                  { label: 'Declining', value: breadth?.declines, color: '#DC2626' },
                  { label: 'Unchanged', value: breadth?.unchanged, color: '#8A96A8' },
                ].map(b => (
                  <div key={b.label} className="p-2 rounded-[8px] bg-[#F4F6FA]">
                    <div className="num text-lg font-bold" style={{ color: b.color }}>
                      {b.value != null ? b.value.toLocaleString('en-IN') : '—'}
                    </div>
                    <div className="text-[11px] text-[#8A96A8]">{b.label}</div>
                  </div>
                ))}
              </div>
              {breadth && (
                <>
                  <div className="h-2 rounded-full overflow-hidden flex bg-[#EEF1F7]">
                    <div className="h-full bg-[#16A34A]" style={{ width: `${(breadth.advances / total) * 100}%` }} />
                    <div className="h-full bg-[#DC2626]" style={{ width: `${(breadth.declines / total) * 100}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#EDF0F7] text-xs">
                    <span className="text-[#4A5568]">Near 52W High</span>
                    <span className="num font-semibold text-[#F97316]">{breadth.high52.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <span className="text-[#4A5568]">Near 52W Low</span>
                    <span className="num font-semibold text-[#D97706]">{breadth.low52.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sector Heatmap */}
        <div id="sector-heatmap" className="card-plain p-6 scroll-mt-24">
          <h3 className="text-sm font-semibold text-[#0D1117] mb-4">Sector Heatmap</h3>
          {!mkt ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array(12).fill(0).map((_, i) => <div key={i} className="h-20 bg-[#EEF1F7] rounded-lg animate-pulse" />)}
            </div>
          ) : mkt.sectors.length === 0 ? (
            <p className="text-sm text-[#8A96A8]">Updating.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {mkt.sectors.map(s => {
                const { bg, text } = heatColor(s.change);
                return (
                  <Link
                    key={s.name}
                    href={`/screener?sector=${encodeURIComponent(s.name)}`}
                    className="rounded-lg p-3 transition-transform hover:scale-[1.03]"
                    style={{ background: bg, color: text }}
                  >
                    <div className="text-xs font-semibold truncate">{s.name}</div>
                    <div className="num text-lg font-bold mt-1">{s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{s.count} stocks</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketsPageClient() {
  return (
    <AuthGate feature="Market Overview" description="Sign up free to see live gainers, losers, sector performance and the market breadth dashboard.">
      <MarketsPageContent />
    </AuthGate>
  );
}
