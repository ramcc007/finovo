'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, X, Menu, TrendingUp, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/screener', label: 'Explorer' },
  { href: '/markets', label: 'Markets' },
  { href: '/screens', label: 'Screens' },
  { href: '/compare', label: 'Compare' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/watchlist', label: 'Watchlist' },
];

interface SearchHit { symbol: string; name: string; sector: string }

export default function Header() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Debounced live search against the API (DB-backed, mock fallback)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        /* aborted or network error */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  const goTo = (symbol: string) => {
    router.push(`/stocks/${symbol}`);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E9EDF4] h-16 flex items-center px-4 md:px-6 gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-[#F97316] rounded-[9px] flex items-center justify-center shadow-[0_2px_8px_rgba(249,115,22,0.30)]">
            <TrendingUp size={16} className="text-white" strokeWidth={2.75} />
          </div>
          <span className="font-bold text-[#131A24] text-[18px] tracking-tight">Finovo</span>
        </Link>

        {/* Search */}
        <div ref={ref} className="relative flex-1 max-w-[460px] mx-auto">
          <div className="flex items-center gap-2.5 bg-[#F2F4F9] hover:bg-[#EDF0F6] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#F97316]/20 focus-within:border-[#F97316]/40 border border-transparent rounded-xl px-3.5 py-2.5 transition-all">
            <Search size={15} className="text-[#8A94A4] shrink-0" />
            <input
              type="text"
              placeholder="Search stocks, symbols…"
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={e => { if (e.key === 'Enter' && results.length > 0) goTo(results[0].symbol); }}
              className="bg-transparent text-sm text-[#131A24] placeholder:text-[#8A94A4] outline-none w-full"
            />
            {loading && <Loader2 size={14} className="text-[#8A94A4] shrink-0 animate-spin" />}
            {query && !loading && (
              <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }}>
                <X size={14} className="text-[#8A94A4] hover:text-[#56616F]" />
              </button>
            )}
          </div>

          {open && query.trim().length >= 2 && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#E9EDF4] rounded-2xl shadow-[0_12px_40px_rgba(16,24,40,0.14)] overflow-hidden z-50">
              {results.length > 0 ? (
                results.map(s => (
                  <button
                    key={s.symbol}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#FFF7ED] transition-colors text-left border-b border-[#F0F3F8] last:border-0 group"
                    onClick={() => goTo(s.symbol)}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#131A24] group-hover:text-[#EA580C] transition-colors">{s.symbol}</div>
                      <div className="text-xs text-[#56616F]">{s.name}</div>
                    </div>
                    {s.sector && <span className="text-[11px] text-[#8A94A4] bg-[#F2F4F9] px-2 py-0.5 rounded-md shrink-0 ml-2">{s.sector}</span>}
                  </button>
                ))
              ) : (
                <div className="px-4 py-4 text-sm text-[#8A94A4]">
                  {loading ? 'Searching…' : `No matches for "${query.trim()}"`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium px-3.5 py-2 rounded-lg transition-colors',
                  active
                    ? 'text-[#EA580C] bg-[#FFF3E8]'
                    : 'text-[#56616F] hover:text-[#131A24] hover:bg-[#F2F4F9]'
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/screener"
            className="ml-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] px-4 py-2 rounded-lg shadow-[0_1px_2px_rgba(234,88,12,0.25)] hover:shadow-[0_6px_16px_rgba(249,115,22,0.28)] transition-all"
          >
            Start screening <ArrowRight size={14} />
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto text-[#56616F] hover:text-[#131A24] p-1.5"
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 z-40 bg-white border-b border-[#E9EDF4] py-3 px-4 shadow-[0_12px_32px_rgba(16,24,40,0.10)]">
          {NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center px-4 py-3 rounded-xl text-sm font-medium mb-1',
                  active
                    ? 'bg-[#FFF3E8] text-[#EA580C]'
                    : 'text-[#56616F] hover:bg-[#F2F4F9] hover:text-[#131A24]'
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/screener"
            className="flex items-center justify-center gap-1.5 mt-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[#F97316]"
          >
            Start screening <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </>
  );
}
