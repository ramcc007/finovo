'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export interface IndexItem { slug: string; term: string; definition: string; letter: string }

/** A-Z list of glossary terms with a search box that filters by term and definition. */
export default function GlossaryIndex({ items }: { items: IndexItem[] }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter(i => i.term.toLowerCase().includes(s) || i.definition.toLowerCase().includes(s)) : items;
  }, [q, items]);
  const letters = [...new Set(items.map(i => i.letter))];
  const groups = letters.map(l => ({ l, list: shown.filter(i => i.letter === l) })).filter(g => g.list.length);

  return (
    <div>
      <label className="relative mb-6 block">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search terms, e.g. repo rate, NAV, P/E"
          aria-label="Search glossary terms"
          className="w-full rounded-xl border border-[#E5E7EB] bg-white py-3 pl-10 pr-4 text-[15px] outline-none focus:border-[#F97316]"
        />
      </label>

      {!q && letters.length > 1 && (
        <nav aria-label="Jump to letter" className="mb-8 flex flex-wrap gap-1.5">
          {letters.map(l => (
            <a key={l} href={`#letter-${l === '#' ? 'num' : l}`} className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-sm font-semibold text-[#0D1117] hover:border-[#F97316] hover:text-[#EA580C]">
              {l}
            </a>
          ))}
        </nav>
      )}

      {groups.length === 0 && <p className="text-[#4A5568]">No terms match &quot;{q}&quot;.</p>}

      {groups.map(g => (
        <section key={g.l} id={`letter-${g.l === '#' ? 'num' : g.l}`} className="mb-8 scroll-mt-24">
          <h2 className="mb-3 border-b border-[#E5E7EB] pb-2 text-xl font-bold text-[#0D1117]">{g.l}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {g.list.map(i => (
              <li key={i.slug}>
                <Link href={`/glossary/${i.slug}`} className="block rounded-xl border border-[#E5E7EB] bg-white p-4 hover:border-[#F97316]">
                  <span className="font-semibold text-[#0D1117]">{i.term}</span>
                  <span className="mt-1 line-clamp-2 block text-sm text-[#4A5568]">{i.definition}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
