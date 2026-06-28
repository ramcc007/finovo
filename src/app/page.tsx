'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, ArrowRight, ArrowUpRight, Loader2,
  SlidersHorizontal, LineChart, ShieldCheck, Zap, Check,
} from 'lucide-react';
import TickerBar from '@/components/layout/TickerBar';
import Reveal from '@/components/ui/Reveal';
import { TOP_GAINERS, TOP_LOSERS, SECTORS, PRE_BUILT_SCREENS } from '@/lib/mock-data';
import { cn, formatPrice } from '@/lib/utils';

interface SearchHit { symbol: string; name: string; sector: string }

function ChangeBadge({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs tnum font-semibold', pos ? 'badge-positive' : 'badge-negative')}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

/* Static upward sparkline for the hero preview card */
function Sparkline() {
  return (
    <svg viewBox="0 0 280 80" className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16A34A" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,62 C20,58 30,50 48,52 C66,54 78,38 96,40 C114,42 126,30 144,28 C162,26 174,34 192,30 C210,26 222,16 240,14 C258,12 270,10 280,8"
        fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round"
      />
      <path
        d="M0,62 C20,58 30,50 48,52 C66,54 78,38 96,40 C114,42 126,30 144,28 C162,26 174,34 192,30 C210,26 222,16 240,14 C258,12 270,10 280,8 L280,80 L0,80 Z"
        fill="url(#spark)"
      />
    </svg>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers'>('gainers');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch {
        /* aborted */
      } finally {
        setSearching(false);
      }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  const stocks = activeTab === 'gainers' ? TOP_GAINERS : TOP_LOSERS;

  return (
    <div>
      <TickerBar />

      {/* ───────────────── HERO ───────────────── */}
      <section className="hero-dark">
        <div className="hero-grid" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-20 md:pb-28">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                <span className="eyebrow text-white/70">Free forever · NSE &amp; BSE</span>
              </div>

              <h1 className="h-display text-white mb-5">
                Research Indian stocks{' '}
                <br className="hidden sm:block" />
                like a <span className="text-[#F97316]">professional.</span>
              </h1>

              <p className="text-white/60 text-base md:text-lg leading-relaxed max-w-xl mb-8">
                Screen 5,000+ NSE &amp; BSE companies with a decade of fundamentals,
                financial ratios, and clean financial statements. No login. No paywall.
              </p>

              {/* Search */}
              <div className="relative max-w-xl mb-4">
                <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
                  <Search size={18} className="text-[#8A96A8] shrink-0" />
                  <input
                    type="text"
                    placeholder="Search any company — TCS, Reliance, HDFC Bank…"
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
                  {searching
                    ? <Loader2 size={16} className="text-[#8A96A8] shrink-0 animate-spin" />
                    : <kbd className="hidden sm:inline text-[10px] text-[#8A96A8] border border-[#E2E8F0] rounded px-1.5 py-0.5 font-sans">↵</kbd>}
                </div>

                {query.trim().length >= 2 && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden z-50 text-left">
                    {searchResults.length > 0 ? (
                      searchResults.map(s => (
                        <Link
                          key={s.symbol}
                          href={`/stocks/${s.symbol}`}
                          onClick={() => setQuery('')}
                          className="flex items-center justify-between px-4 py-3 hover:bg-[#FFF7ED] transition-colors border-b border-[#EDF0F7] last:border-0"
                        >
                          <div>
                            <span className="text-sm font-semibold text-[#0D1117]">{s.symbol}</span>
                            <span className="text-xs text-[#4A5568] ml-2">{s.name}</span>
                          </div>
                          {s.sector && <span className="text-xs text-[#8A96A8] bg-[#F4F6FA] px-2 py-0.5 rounded shrink-0 ml-2">{s.sector}</span>}
                        </Link>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-sm text-[#8A96A8]">
                        {searching ? 'Searching…' : `No matches for "${query.trim()}"`}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick chips */}
              <div className="flex items-center gap-2 mb-8 flex-wrap">
                <span className="text-xs text-white/40">Popular:</span>
                {['TCS', 'RELIANCE', 'HDFCBANK', 'INFY'].map(sym => (
                  <Link
                    key={sym}
                    href={`/stocks/${sym}`}
                    className="text-xs font-medium text-white/80 bg-white/5 border border-white/10 px-3 py-1 rounded-full hover:bg-white/10 hover:border-white/20 transition-colors"
                  >
                    {sym}
                  </Link>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/screener" className="btn btn-primary">
                  Open Explorer <ArrowRight size={16} />
                </Link>
                <Link href="/markets" className="btn btn-on-dark">
                  Explore markets
                </Link>
              </div>
            </div>

            {/* Right: product preview */}
            <Reveal delay={120} className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-[#F97316]/10 to-transparent rounded-3xl blur-2xl" />
                <div className="relative bg-white rounded-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)] overflow-hidden">
                  {/* preview header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDF0F7]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#0D1117]">TCS</span>
                        <span className="text-[10px] bg-[#FFF7ED] text-[#F97316] px-2 py-0.5 rounded font-semibold">IT Services</span>
                      </div>
                      <div className="text-xs text-[#8A96A8]">Tata Consultancy Services</div>
                    </div>
                    <div className="text-right">
                      <div className="tnum text-base font-bold text-[#0D1117]">₹3,842.50</div>
                      <div className="tnum text-xs font-semibold text-[#16A34A]">▲ 1.11%</div>
                    </div>
                  </div>
                  {/* sparkline */}
                  <div className="px-5 pt-4">
                    <Sparkline />
                  </div>
                  {/* metrics grid */}
                  <div className="grid grid-cols-3 divide-x divide-[#EDF0F7] border-t border-[#EDF0F7] mt-3">
                    {[
                      { k: 'P/E', v: '28.4' },
                      { k: 'ROE', v: '52.3%' },
                      { k: 'D/E', v: '0.02' },
                    ].map(m => (
                      <div key={m.k} className="px-4 py-3 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-[#8A96A8] mb-0.5">{m.k}</div>
                        <div className="tnum text-sm font-bold text-[#0D1117]">{m.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3 bg-[#FAFBFD] border-t border-[#EDF0F7] flex items-center justify-between">
                    <span className="text-xs text-[#4A5568]">10-year financials available</span>
                    <ArrowUpRight size={14} className="text-[#F97316]" />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Trust strip */}
        <div className="relative border-t border-white/8">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { v: '5,000+', l: 'Listed companies' },
              { v: '47+', l: 'Financial metrics' },
              { v: '10Y', l: 'Historical data' },
              { v: '₹0', l: 'Cost, forever' },
            ].map(s => (
              <div key={s.l} className="text-center md:text-left">
                <div className="tnum text-2xl font-bold text-white">{s.v}</div>
                <div className="text-xs text-white/45 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── LIVE MARKET ───────────────── */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-14 md:py-20">
        <Reveal>
          <div className="flex items-end justify-between mb-7">
            <div>
              <h2 className="h-section text-[#0D1117]">Today&apos;s market</h2>
              <p className="text-sm text-[#4A5568] mt-1">Live movers and breadth across the Indian markets.</p>
            </div>
            <Link href="/markets" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-[#F97316] hover:gap-2.5 transition-all">
              Full overview <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Movers */}
          <Reveal className="lg:col-span-2">
            <div className="card-plain p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDF0F7]">
                <h3 className="font-semibold text-[#0D1117] text-sm">Market Movers</h3>
                <div className="flex gap-1 bg-[#EEF1F7] p-0.5 rounded-lg">
                  {(['gainers', 'losers'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'text-xs font-semibold px-3 py-1.5 rounded-md transition-all',
                        activeTab === tab ? 'bg-white text-[#0D1117] shadow-sm' : 'text-[#4A5568] hover:text-[#0D1117]'
                      )}
                    >
                      {tab === 'gainers' ? 'Gainers' : 'Losers'}
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
                    <th className="hidden sm:table-cell">Volume</th>
                    <th className="hidden md:table-cell">Mkt Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map(s => (
                    <tr key={s.symbol} className="group" onClick={() => router.push(`/stocks/${s.symbol}`)}>
                      <td>
                        <div className="font-semibold text-[#0D1117] group-hover:text-[#F97316] transition-colors">{s.symbol}</div>
                        <div className="text-[11px] text-[#8A96A8] font-sans mt-0.5">{s.name}</div>
                      </td>
                      <td>{formatPrice(s.price)}</td>
                      <td><ChangeBadge value={s.changePct} /></td>
                      <td className="hidden sm:table-cell text-[#4A5568]">{s.volume}</td>
                      <td className="hidden md:table-cell text-[#4A5568]">{s.marketCap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          {/* Breadth + FII/DII */}
          <Reveal delay={80}>
            <div className="space-y-6">
              <div className="card-plain p-6">
                <h3 className="font-semibold text-[#0D1117] text-sm mb-5">Market Breadth</h3>
                <div className="space-y-3.5">
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
                      <span className="tnum text-sm font-semibold text-[#0D1117]">{item.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 h-2 rounded-full overflow-hidden flex">
                  <div className="h-full bg-[#16A34A]" style={{ width: '57%' }} />
                  <div className="h-full bg-[#8A96A8]" style={{ width: '6%' }} />
                  <div className="h-full bg-[#DC2626]" style={{ width: '37%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-[#8A96A8] mt-1.5">
                  <span>57% Bullish</span><span>37% Bearish</span>
                </div>
              </div>

              <div className="card-plain p-6">
                <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-4">FII / DII Activity</h3>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-[#4A5568]">FII Net</span>
                  <span className="tnum text-sm font-semibold text-[#16A34A]">+₹1,248 Cr</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-[#4A5568]">DII Net</span>
                  <span className="tnum text-sm font-semibold text-[#DC2626]">−₹432 Cr</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Sector performance */}
        <Reveal>
          <div className="card-plain p-6 mt-6">
            <h3 className="font-semibold text-[#0D1117] text-sm mb-5">Sector Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3">
              {SECTORS.map(s => {
                const pos = s.change >= 0;
                const width = Math.min(Math.abs(s.change) / 1.5 * 100, 100);
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#0D1117]">{s.name}</span>
                      <span className={cn('tnum text-xs font-semibold', pos ? 'text-positive' : 'text-negative')}>
                        {pos ? '+' : ''}{s.change.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#EEF1F7] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${width}%`, background: pos ? '#16A34A' : '#DC2626' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ───────────────── POPULAR SCREENS ───────────────── */}
      <section className="bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-14 md:py-20">
          <Reveal>
            <div className="flex items-end justify-between mb-7">
              <div>
                <h2 className="h-section text-[#0D1117]">Start with a proven screen</h2>
                <p className="text-sm text-[#4A5568] mt-1">Curated filters used by serious investors — one click to run.</p>
              </div>
              <Link href="/screens" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-[#F97316] hover:gap-2.5 transition-all">
                View all <ArrowRight size={14} />
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRE_BUILT_SCREENS.map((screen, i) => (
              <Reveal key={screen.id} delay={i * 50}>
                <Link href="/screens" className="card-plain lift p-6 block h-full group">
                  <div className="flex items-start justify-between mb-2.5">
                    <h3 className="font-semibold text-[#0D1117] text-sm group-hover:text-[#F97316] transition-colors">{screen.title}</h3>
                    <span className="tnum text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EEF1F7] text-[#4A5568]">{screen.count}</span>
                  </div>
                  <p className="text-xs text-[#4A5568] mb-3 leading-relaxed">{screen.description}</p>
                  <p className="text-[11px] text-[#8A96A8] tnum">{screen.filters}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── WHY FINOVO ───────────────── */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-14 md:py-20">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="h-section text-[#0D1117]">Everything you need to analyse a stock</h2>
            <p className="text-sm text-[#4A5568] mt-2">Built for clarity. No noise, no upsell, no hidden tiers.</p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: SlidersHorizontal,
              title: 'Powerful explorer',
              desc: 'Filter 5,000+ stocks across 47 fundamental and valuation metrics. Build, sort, and explore custom views in seconds.',
            },
            {
              icon: LineChart,
              title: 'Deep fundamentals',
              desc: '10 years of P&L, balance sheet, cash flow, ratios, and shareholding — presented cleanly, the way analysts read them.',
            },
            {
              icon: ShieldCheck,
              title: 'Free & transparent',
              desc: 'Sourced from public NSE & BSE data. No login wall, no premium lock, no card required. Ever.',
            },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="card-plain lift p-7 h-full">
                <div className="w-11 h-11 rounded-xl bg-[#FFF7ED] flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-[#F97316]" />
                </div>
                <h3 className="font-semibold text-[#0D1117] text-[15px] mb-2">{f.title}</h3>
                <p className="text-sm text-[#4A5568] leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────────── CTA BAND ───────────────── */}
      <section className="px-4 md:px-6 pb-16 md:pb-24">
        <Reveal>
          <div className="hero-dark max-w-7xl mx-auto rounded-2xl px-6 md:px-12 py-12 md:py-16 text-center relative">
            <div className="hero-grid" />
            <div className="relative">
              <Zap size={28} className="text-[#F97316] mx-auto mb-4" />
              <h2 className="h-section text-white mb-3">Find your next investment idea</h2>
              <p className="text-white/55 text-base max-w-lg mx-auto mb-8">
                Open the Explorer and start filtering the entire Indian market — completely free.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/screener" className="btn btn-primary">
                  Launch Explorer <ArrowRight size={16} />
                </Link>
                <Link href="/screens" className="btn btn-on-dark">
                  Browse ready-made screens
                </Link>
              </div>
              <div className="flex items-center justify-center gap-5 mt-7 text-xs text-white/40">
                {['No login required', 'No credit card', '100% free'].map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <Check size={13} className="text-[#16A34A]" /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
