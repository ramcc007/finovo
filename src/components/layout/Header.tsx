'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { SCREENER_STOCKS } from '@/lib/mock-data';

export default function Header() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const results = query.length > 1
    ? SCREENER_STOCKS.filter(s =>
        s.symbol.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E4E0] h-14 flex items-center px-6 gap-6">
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <span className="text-[#4F46E5] text-xl">◆</span>
        <span className="font-bold text-[#1A1917] text-lg tracking-tight">Finovo</span>
      </Link>

      {/* Search */}
      <div ref={ref} className="relative flex-1 max-w-[440px]">
        <div className="flex items-center gap-2 bg-[#F1F0ED] rounded-full px-4 py-2">
          <Search size={15} className="text-[#9C9894] shrink-0" />
          <input
            type="text"
            placeholder="Search stocks, symbols..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="bg-transparent text-sm text-[#1A1917] placeholder:text-[#9C9894] outline-none w-full"
          />
          {query && (
            <button onClick={() => { setQuery(''); setOpen(false); }}>
              <X size={13} className="text-[#9C9894]" />
            </button>
          )}
        </div>

        {open && results.length > 0 && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#E5E4E0] rounded-[10px] shadow-md overflow-hidden z-50">
            {results.map(s => (
              <button
                key={s.symbol}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#EEF2FF] transition-colors text-left"
                onClick={() => {
                  router.push(`/stocks/${s.symbol}`);
                  setQuery('');
                  setOpen(false);
                }}
              >
                <div>
                  <div className="text-sm font-semibold text-[#1A1917]">{s.symbol}</div>
                  <div className="text-xs text-[#6B6966]">{s.name}</div>
                </div>
                <span className="text-xs text-[#9C9894] bg-[#F1F0ED] px-2 py-0.5 rounded-sm">{s.sector}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="hidden md:flex items-center gap-6 ml-2">
        {[
          { href: '/screener', label: 'Screener' },
          { href: '/markets', label: 'Markets' },
          { href: '/screens', label: 'Screens' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm font-medium text-[#6B6966] hover:text-[#1A1917] transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto shrink-0">
        <button className="text-sm font-medium text-[#4F46E5] border border-[#4F46E5] px-4 py-1.5 rounded-[6px] hover:bg-[#EEF2FF] transition-colors">
          Login
        </button>
      </div>
    </header>
  );
}
