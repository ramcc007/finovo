'use client';

import { useState } from 'react';
import { Link2, Star } from 'lucide-react';
import LocalTime from './LocalTime';
import { TAG_LABEL, anchorOf, type ElectionUpdate } from '@/lib/election/types';

type Filter = 'all' | 'key' | 'senate' | 'house' | 'governor' | 'markets';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'key', label: 'Key moments' }, { id: 'senate', label: 'Senate' },
  { id: 'house', label: 'House' }, { id: 'governor', label: 'Governors' }, { id: 'markets', label: 'Markets' },
];

const matches = (u: ElectionUpdate, f: Filter) =>
  f === 'all' ? true : f === 'key' ? u.importance === 5 : f === 'markets' ? u.tag === 'markets' || !!u.marketImpact : u.tag === f;

export default function LiveTimeline({ updates }: { updates: ElectionUpdate[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [copied, setCopied] = useState<string | null>(null);
  const shown = updates.filter(u => matches(u, filter));

  const copy = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${anchorOf(id)}`;
    try { await navigator.clipboard.writeText(url); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };

  return (
    <div>
      <div role="group" aria-label="Filter updates" className="mb-8 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
            className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors ${filter === f.id
              ? 'border-[#F97316] bg-[#F97316] text-white' : 'border-[#E5E7EB] bg-white text-[#4A5568] hover:border-[#F97316]'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-white px-5 py-10 text-center text-[#4A5568]">
          {updates.length === 0 ? 'The first updates will appear here shortly.' : 'No updates in this category yet.'}
        </p>
      ) : (
        <ol className="relative ml-3 border-l-2 border-[#E5E7EB]">
          {shown.map(u => (
            <li key={u.id} id={anchorOf(u.id)} className="relative scroll-mt-24 pb-9 pl-6 last:pb-0 md:pl-8">
              <span aria-hidden className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white ${u.importance === 5 ? 'bg-[#EA580C] ring-4 ring-[#FFEDD5]' : 'bg-[#9CA3AF]'}`} />
              <article>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <LocalTime iso={u.publishedAt} className="font-semibold text-[#4A5568]" />
                  {u.importance === 5 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF7ED] px-2 py-0.5 font-bold uppercase tracking-wide text-[#C2410C]">
                      <Star size={11} aria-hidden fill="currentColor" /> Key
                    </span>
                  )}
                  <span className="font-semibold uppercase tracking-wide text-[#8A96A8]">{TAG_LABEL[u.tag]}</span>
                </div>
                <h2 className="mt-1.5 text-xl font-bold leading-snug text-[#0D1117]">{u.headline}</h2>
                <p className="mt-2 text-base leading-relaxed text-[#374151]">{u.summary}</p>
                {u.marketImpact && (
                  <p className="mt-3 rounded-lg border-l-4 border-[#F97316] bg-[#FFF7ED] px-4 py-2.5 text-[15px] leading-relaxed text-[#7C2D12]">
                    <span className="font-semibold">Market impact: </span>{u.marketImpact}
                    {u.marketRegions.length > 0 && (
                      <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                        {u.marketRegions.map(r => <span key={r} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#C2410C] ring-1 ring-[#FED7AA]">{r}</span>)}
                      </span>
                    )}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#8A96A8]">
                  <span>Source:</span>
                  {u.sources.map(s => (
                    <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-8 items-center font-semibold text-[#6B7280] underline decoration-[#D1D5DB] underline-offset-2 hover:text-[#EA580C]">
                      {s.name} ↗
                    </a>
                  ))}
                  <button type="button" onClick={() => copy(u.id)} aria-label="Copy link to this update"
                    className="ml-auto inline-flex min-h-8 items-center gap-1 hover:text-[#EA580C]">
                    <Link2 size={13} aria-hidden /> {copied === u.id ? 'Copied' : 'Link'}
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
