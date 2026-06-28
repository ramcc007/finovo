'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, X, Menu, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/screener', label: 'Explorer' },
  { href: '/markets', label: 'Markets' },
  { href: '/screens', label: 'Screens' },
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
      <header className="sticky top-0 z-50 bg-[#080C10] border-b border-white/10 h-14 flex items-center px-4 md:px-6 gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-[#F97316] rounded-[6px] flex items-center justify-center">
            <TrendingUp size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-white text-[17px] tracking-tight">Finovo</span>
        </Link>

        {/* Search */}
        <div ref={ref} className="relative flex-1 max-w-[480px] mx-auto">
          <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg px-3 py-2 transition-colors">
            <Search size={14} className="text-white/50 shrink-0" />
            <input
              type="text"
              placeholder="Search stocks, symbols..."
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={e => { if (e.key === 'Enter' && results.length > 0) goTo(results[0].symbol); }}
              className="bg-transparent text-sm text-white placeholder:text-white/40 outline-none w-full"
            />
            {loading && <Loader2 size={13} className="text-white/50 shrink-0 animate-spin" />}
            {query && !loading && (
              <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }}>
                <X size={13} className="text-white/40 hover:text-white/70" />
              </button>
            )}
          </div>

          {open && query.trim().length >= 2 && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50">
              {results.length > 0 ? (
                results.map(s => (
                  <button
                    key={s.symbol}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#FFF7ED] transition-colors text-left border-b border-[#EDF0F7] last:border-0"
                    onClick={() => goTo(s.symbol)}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#0D1117]">{s.symbol}</div>
                      <div className="text-xs text-[#4A5568]">{s.name}</div>
                    </div>
                    {s.sector && <span className="text-xs text-[#8A96A8] bg-[#F4F6FA] px-2 py-0.5 rounded shrink-0 ml-2">{s.sector}</span>}
                  </button>
                ))
              ) : (
                <div className="px-4 py-4 text-sm text-[#8A96A8]">
                  {loading ? 'Searching…' : `No matches for "${query.trim()}"`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm font-medium px-3 py-1.5 rounded-lg transition-colors',
                pathname === item.href
                  ? 'bg-[#F97316] text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto text-white/70 hover:text-white p-1.5"
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 z-40 bg-[#0F1923] border-b border-white/10 py-3 px-4 shadow-lg">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 rounded-lg text-sm font-medium mb-1',
                pathname === item.href
                  ? 'bg-[#F97316] text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
