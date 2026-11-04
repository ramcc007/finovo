'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock, Search, X } from 'lucide-react';
import ShareBar from '@/components/blog/ShareBar';
import BookmarkButton from '@/components/election/BookmarkButton';
import { styleOf } from '@/lib/glossaryHub';

export interface IndexItem { slug: string; term: string; definition: string; letter: string; category: string; minutes: number }
export interface Ref { slug: string; term: string }
export interface Path { id: string; title: string; blurb: string; terms: Ref[] }

const BASE = 'https://www.scripwise.co.in';
const TITLE = 'Stock market glossary';
const idOf = (l: string) => `letter-${l === '#' ? 'num' : l}`;

function Pill({ category }: { category: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${styleOf(category).pill}`}>{category}</span>;
}

function TermCard({ i, isNew }: { i: IndexItem; isNew: boolean }) {
  return (
    <Link href={`/glossary/${i.slug}`} className="group flex h-full flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#F97316] hover:shadow-md">
      <span className="flex items-start justify-between gap-2">
        <span className="font-semibold text-[#0D1117]">{i.term}</span>
        {isNew && <span className="shrink-0 rounded-full bg-[#EA580C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New</span>}
      </span>
      <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-[#4A5568]">{i.definition}</span>
      <span className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="flex items-center gap-2"><Pill category={i.category} /><span className="inline-flex items-center gap-1 text-xs text-[#8A96A8]"><Clock size={12} aria-hidden />{i.minutes} min</span></span>
        <ArrowRight size={15} className="text-[#C9CFD9] transition-transform group-hover:translate-x-0.5 group-hover:text-[#EA580C]" aria-hidden />
      </span>
    </Link>
  );
}

/** The interactive glossary home: hero with instant search, learning paths, topics, A-Z list. */
export default function GlossaryIndex({ items, popular, paths, newest }: { items: IndexItem[]; popular: Ref[]; paths: Path[]; newest: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [letter, setLetter] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const newSet = useMemo(() => new Set(newest), [newest]);

  const categories = useMemo(() => {
    const m = new Map<string, IndexItem[]>();
    for (const i of items) m.set(i.category, [...(m.get(i.category) ?? []), i]);
    return [...m].map(([name, list]) => ({ name, list })).sort((a, b) => b.list.length - a.list.length);
  }, [items]);

  const query = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return [];
    const score = (i: IndexItem) => (i.term.toLowerCase().startsWith(query) ? 0 : i.term.toLowerCase().includes(query) ? 1 : i.definition.toLowerCase().includes(query) ? 2 : 3);
    return items.filter(i => score(i) < 3).sort((a, b) => score(a) - score(b) || a.term.localeCompare(b.term));
  }, [items, query]);
  const suggestions = matches.slice(0, 6);

  const base = useMemo(() => (cat === 'All' ? items : items.filter(i => i.category === cat)), [items, cat]);
  const shown = query ? matches.filter(i => cat === 'All' || i.category === cat) : base;
  const letters = useMemo(() => [...new Set(shown.map(i => i.letter))], [shown]);
  const groups = letters.map(l => ({ l, list: shown.filter(i => i.letter === l) }));
  const browsing = !query && cat === 'All';

  // Press "/" anywhere to jump to search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === '/' && !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))) { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Highlight the letter currently in view.
  useEffect(() => {
    if (query) return;
    const els = letters.map(l => document.getElementById(idOf(l))).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(es => { const v = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setLetter(v.target.id); }, { rootMargin: '-120px 0px -70% 0px' });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  }, [letters, query]);

  const open = focused && suggestions.length > 0;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(suggestions.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(-1, a - 1)); }
    else if (e.key === 'Enter') { const s = suggestions[active] ?? (active === -1 && suggestions.length === 1 ? suggestions[0] : undefined); if (s) { e.preventDefault(); router.push(`/glossary/${s.slug}`); } }
    else if (e.key === 'Escape') { setQ(''); setActive(-1); input.current?.blur(); }
  };

  return (
    <div>
      <header className="hero-dark relative overflow-hidden">
        <div className="hero-grid" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#F97316]/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-xs text-white/50">
            <Link href="/" className="inline-block py-1.5 hover:text-white">Home</Link> / Glossary
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">{TITLE}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
            Indian investing terms in plain words. Each entry says what the term means, how it works in India, and where you will meet it, from your first demat account to futures and options.
          </p>

          <div className="relative mt-7 max-w-2xl">
            <label htmlFor="g-search" className="sr-only">Search glossary terms</label>
            <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8A96A8]" aria-hidden />
            <input id="g-search" ref={input} type="text" role="combobox" aria-expanded={open} aria-controls="g-suggest" aria-autocomplete="list" autoComplete="off"
              value={q} onChange={e => { setQ(e.target.value); setActive(-1); }} onKeyDown={onKeyDown} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 120)}
              placeholder="Search terms, e.g. repo rate, NAV, P/E"
              className="h-14 w-full rounded-2xl border border-white/10 bg-white py-3 pl-12 pr-24 text-base text-[#0D1117] shadow-xl outline-none ring-0 placeholder:text-[#9CA3AF] focus:ring-4 focus:ring-[#F97316]/40" />
            {q ? (
              <button type="button" onClick={() => { setQ(''); input.current?.focus(); }} aria-label="Clear search" className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#6B7280] hover:bg-[#F3F4F6]"><X size={18} /></button>
            ) : (
              <kbd aria-hidden className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-xs font-semibold text-[#8A96A8] sm:block">/</kbd>
            )}
            {open && (
              <ul id="g-suggest" role="listbox" className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white py-1 shadow-2xl">
                {suggestions.map((s, n) => (
                  <li key={s.slug} role="option" aria-selected={n === active}>
                    <Link href={`/glossary/${s.slug}`} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${n === active ? 'bg-[#FFF7ED]' : 'hover:bg-[#F9FAFB]'}`}>
                      <span className="min-w-0"><span className="block font-semibold text-[#0D1117]">{s.term}</span><span className="block truncate text-xs text-[#6B7280]">{s.definition}</span></span>
                      <Pill category={s.category} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {popular.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-white/50">Popular:</span>
              {popular.map(p => <Link key={p.slug} href={`/glossary/${p.slug}`} className="inline-flex min-h-8 items-center rounded-full bg-white/10 px-3 font-medium text-white/90 ring-1 ring-white/10 hover:bg-white/20">{p.term.replace(/ \(.*\)$/, '')}</Link>)}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <p className="text-sm text-white/60"><strong className="text-white">{items.length}</strong> terms · <strong className="text-white">{categories.length}</strong> topics</p>
            <div className="flex flex-wrap items-center gap-3"><BookmarkButton dark url={`${BASE}/glossary`} title={TITLE} /><ShareBar compact url={`${BASE}/glossary`} title={TITLE} /></div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        {browsing && paths.length > 0 && (
          <section aria-labelledby="paths-h" className="mb-12">
            <h2 id="paths-h" className="text-2xl font-extrabold tracking-tight text-[#0D1117]">Start here</h2>
            <p className="mt-1 text-sm text-[#4A5568]">New to a topic? Read these terms in order.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {paths.map(p => (
                <div key={p.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                  <h3 className="font-bold text-[#0D1117]">{p.title}</h3>
                  <p className="mt-0.5 text-sm text-[#6B7280]">{p.blurb}</p>
                  <ol className="mt-3 space-y-1.5">
                    {p.terms.map((t, n) => (
                      <li key={t.slug}>
                        <Link href={`/glossary/${t.slug}`} className="group flex items-center gap-3 rounded-lg px-1 py-1 text-sm hover:bg-[#FFF7ED]">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFEDD5] text-xs font-bold text-[#C2410C]">{n + 1}</span>
                          <span className="font-medium text-[#0D1117] group-hover:text-[#C2410C]">{t.term}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        )}

        {browsing && newest.length > 0 && (
          <section aria-labelledby="new-h" className="mb-12">
            <h2 id="new-h" className="text-2xl font-extrabold tracking-tight text-[#0D1117]">New this week</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {newest.map(s => items.find(i => i.slug === s)).filter((i): i is IndexItem => !!i).map(i => <li key={i.slug}><TermCard i={i} isNew /></li>)}
            </ul>
          </section>
        )}

        {browsing && (
          <section aria-labelledby="topics-h" className="mb-12">
            <h2 id="topics-h" className="text-2xl font-extrabold tracking-tight text-[#0D1117]">Browse by topic</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map(c => (
                <button key={c.name} type="button" onClick={() => { setCat(c.name); document.getElementById('all-terms')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#F97316] hover:shadow-md">
                  <span className="flex items-center justify-between"><span className="flex items-center gap-2 font-bold text-[#0D1117]"><span className={`h-2.5 w-2.5 rounded-full ${styleOf(c.name).dot}`} aria-hidden />{c.name}</span><span className="text-sm font-semibold text-[#8A96A8]">{c.list.length}</span></span>
                  {styleOf(c.name).blurb && <span className="mt-1.5 block text-sm text-[#4A5568]">{styleOf(c.name).blurb}</span>}
                  <span className="mt-3 block truncate text-xs text-[#8A96A8]">{c.list.slice(0, 3).map(i => i.term.replace(/ \(.*\)$/, '')).join(' · ')}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section id="all-terms" aria-labelledby="all-h" className="scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="all-h" className="text-2xl font-extrabold tracking-tight text-[#0D1117]">{query ? `Results for “${q.trim()}”` : cat === 'All' ? 'All terms A to Z' : cat}</h2>
            <p className="text-sm text-[#8A96A8]" aria-live="polite">{shown.length} {shown.length === 1 ? 'term' : 'terms'}</p>
          </div>

          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter by topic">
            {[{ name: 'All', n: items.length }, ...categories.map(c => ({ name: c.name, n: c.list.length }))].map(c => (
              <button key={c.name} type="button" aria-pressed={cat === c.name} onClick={() => setCat(c.name)}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ring-1 ring-inset transition-colors ${cat === c.name ? 'bg-[#0D1117] text-white ring-[#0D1117]' : 'bg-white text-[#4A5568] ring-[#E5E7EB] hover:ring-[#F97316]'}`}>
                {c.name}<span className={cat === c.name ? 'text-white/60' : 'text-[#9CA3AF]'}>{c.n}</span>
              </button>
            ))}
          </div>

          {!query && letters.length > 1 && (
            <nav aria-label="Jump to letter" className="sticky top-16 z-20 -mx-4 mt-4 overflow-x-auto border-b border-[#E9EDF4] bg-white/90 px-4 py-2 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-3">
              <div className="flex min-w-max gap-1">
                {letters.map(l => (
                  <a key={l} href={`#${idOf(l)}`} aria-current={letter === idOf(l) ? 'true' : undefined}
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold ${letter === idOf(l) ? 'bg-[#F97316] text-white' : 'text-[#0D1117] hover:bg-[#FFF7ED] hover:text-[#EA580C]'}`}>{l}</a>
                ))}
              </div>
            </nav>
          )}

          {groups.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-8 text-center">
              <p className="font-semibold text-[#0D1117]">No term matches “{q.trim()}”.</p>
              <p className="mt-1 text-sm text-[#4A5568]">Check the spelling, try a shorter word, or start from a popular term.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {popular.slice(0, 5).map(p => <Link key={p.slug} href={`/glossary/${p.slug}`} className="rounded-full bg-[#FFF7ED] px-3 py-1.5 text-sm font-semibold text-[#C2410C] hover:bg-[#FFEDD5]">{p.term.replace(/ \(.*\)$/, '')}</Link>)}
              </div>
              <button type="button" onClick={() => { setQ(''); setCat('All'); }} className="mt-4 text-sm font-semibold text-[#EA580C] hover:underline">Clear search and filters</button>
            </div>
          )}

          {groups.map(g => (
            <section key={g.l} id={idOf(g.l)} className="mt-8 scroll-mt-36">
              <h3 className="mb-3 border-b border-[#E5E7EB] pb-2 text-xl font-bold text-[#0D1117]">{g.l}</h3>
              <ul className="grid gap-4 sm:grid-cols-2">
                {g.list.map(i => <li key={i.slug}><TermCard i={i} isNew={newSet.has(i.slug)} /></li>)}
              </ul>
            </section>
          ))}
        </section>
      </div>
    </div>
  );
}
