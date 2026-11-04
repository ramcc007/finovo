'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { SearchDoc } from '@/lib/contentSearch';

/** Search box with instant suggestions for glossary terms or blog articles. Enter opens the highlighted
 *  suggestion, or the full results page when none is highlighted. Press "/" to focus it. */
export default function ContentSearch({ type, placeholder, fullHref, large = false, id }: { type: 'glossary' | 'blog'; placeholder: string; fullHref: string; large?: boolean; id: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchDoc[]>([]);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/content-search?type=${type}&q=${encodeURIComponent(query)}`, { signal: ctl.signal });
        if (r.ok) { setResults(await r.json()); setActive(-1); }
      } catch { /* a newer keystroke replaced this request */ }
    }, 150);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, type]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === '/' && !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))) { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const shown = q.trim().length >= 2 ? results : [];
  const open = focused && shown.length > 0;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(shown.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(-1, a - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (shown[active]) router.push(shown[active].href);
      else if (q.trim()) router.push(`${fullHref}?q=${encodeURIComponent(q.trim())}`);
    } else if (e.key === 'Escape') { setQ(''); setResults([]); setActive(-1); input.current?.blur(); }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{placeholder}</label>
      <Search size={large ? 20 : 17} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#8A96A8] ${large ? 'left-4' : 'left-3.5'}`} aria-hidden />
      <input id={id} ref={input} type="text" role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" autoComplete="off" enterKeyHint="search"
        value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        className={`w-full rounded-2xl border border-white/10 bg-white text-[#0D1117] shadow-xl outline-none placeholder:text-[#9CA3AF] focus:ring-4 focus:ring-[#F97316]/40 ${large ? 'h-14 pl-12 pr-14 text-base' : 'h-12 pl-10 pr-12 text-[15px]'}`} />
      {q ? (
        <button type="button" onClick={() => { setQ(''); setResults([]); input.current?.focus(); }} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#6B7280] hover:bg-[#F3F4F6]"><X size={18} /></button>
      ) : (
        <kbd aria-hidden className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-xs font-semibold text-[#8A96A8] sm:block">/</kbd>
      )}
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white py-1 shadow-2xl">
          {shown.map((s, n) => (
            <li key={s.href} role="option" aria-selected={n === active}>
              <Link href={s.href} className={`flex items-start justify-between gap-3 px-4 py-2.5 ${n === active ? 'bg-[#FFF7ED]' : 'hover:bg-[#F9FAFB]'}`}>
                <span className="min-w-0"><span className="block font-semibold text-[#0D1117]">{s.title}</span><span className="line-clamp-1 block text-xs text-[#6B7280]">{s.sub}</span></span>
                <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#4A5568]">{s.tag}</span>
              </Link>
            </li>
          ))}
          <li className="border-t border-[#F1F3F9]"><Link href={`${fullHref}?q=${encodeURIComponent(q.trim())}`} className="block px-4 py-2.5 text-sm font-semibold text-[#EA580C] hover:bg-[#FFF7ED]">See all results for “{q.trim()}”</Link></li>
        </ul>
      )}
    </div>
  );
}
