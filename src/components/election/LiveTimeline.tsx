'use client';

import { useState } from 'react';
import { Check, Link2, Star, TrendingUp } from 'lucide-react';
import PtTime from './PtTime';
import YouTubeLite from './YouTubeLite';
import { TAG_LABEL, anchorOf, type ElectionUpdate, type Tag } from '@/lib/election/types';

type Filter = 'all' | 'key' | 'senate' | 'house' | 'governor' | 'markets';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'key', label: 'Key moments' }, { id: 'senate', label: 'Senate' },
  { id: 'house', label: 'House' }, { id: 'governor', label: 'Governors' }, { id: 'markets', label: 'Markets' },
];
const TAG_CLS: Record<Tag, string> = {
  senate: 'bg-blue-50 text-blue-700 ring-blue-600/20', house: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  governor: 'bg-purple-50 text-purple-700 ring-purple-600/20', markets: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  other: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const matches = (u: ElectionUpdate, f: Filter) =>
  f === 'all' ? true : f === 'key' ? u.importance === 5 : f === 'markets' ? u.tag === 'markets' || !!u.marketImpact : u.tag === f;

export default function LiveTimeline({ updates, simple = false }: { updates: ElectionUpdate[]; simple?: boolean }) {
  const [filter, setFilter] = useState<Filter>('all');
  const filters = simple ? FILTERS.filter(f => f.id === 'all' || f.id === 'key') : FILTERS;
  const [copied, setCopied] = useState<{ id: string; ok: boolean } | null>(null);
  const shown = updates.filter(u => matches(u, filter));

  const copy = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${anchorOf(id)}`;
    let ok = true;
    try { await navigator.clipboard.writeText(url); } catch { ok = false; window.history.replaceState(null, "", `#${anchorOf(id)}`); } // no clipboard access: put the link in the address bar instead
    setCopied({ id, ok });
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div>
      <div role="group" aria-label="Filter updates" className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {filters.map(f => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-all ${filter === f.id
              ? 'bg-[#0D1117] text-white shadow-md' : 'bg-white text-[#4A5568] ring-1 ring-[#E5E7EB] hover:ring-[#F97316]'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white px-5 py-12 text-center text-[#4A5568]">
          {updates.length === 0 ? 'The first updates will appear here shortly.' : 'No updates in this category yet.'}
        </p>
      ) : (
        <ol className="relative ml-2 border-l-2 border-[#E5E7EB] sm:ml-3">
          {shown.map(u => {
            const key = u.importance === 5;
            return (
              <li key={u.id} id={anchorOf(u.id)} className="relative scroll-mt-24 pb-6 pl-5 last:pb-0 sm:pl-8">
                <span aria-hidden className={`absolute -left-[9px] top-5 h-4 w-4 rounded-full border-[3px] border-[#F4F6FA] ${key ? 'bg-[#EA580C] ring-4 ring-[#FED7AA]' : 'bg-[#9CA3AF]'}`} />
                <article className={`rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 ${key ? 'bg-gradient-to-br from-[#FFF7ED] to-white ring-1 ring-[#FDBA74]' : 'bg-white ring-1 ring-[#E5E7EB]'}`}>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
                    <a href={`#${anchorOf(u.id)}`} title="Link to this update" className="rounded font-semibold text-[#4A5568] underline-offset-2 hover:text-[#EA580C] hover:underline"><PtTime iso={u.publishedAt} /></a>
                    <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${TAG_CLS[u.tag]}`}>{TAG_LABEL[u.tag]}</span>
                    {key && <span className="inline-flex items-center gap-1 rounded-full bg-[#EA580C] px-2 py-0.5 font-bold uppercase tracking-wide text-white"><Star size={11} aria-hidden fill="currentColor" /> Key moment</span>}
                  </div>
                  <h2 className="mt-2 text-lg font-bold leading-snug text-[#0D1117] sm:text-xl">{u.headline}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#374151] sm:text-base">{u.summary}</p>

                  {u.media?.type === 'image' && (
                    <figure className="m-0 mt-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u.media.url} alt={u.media.alt ?? ''} loading="lazy" referrerPolicy="no-referrer" className="max-h-[420px] w-full rounded-xl object-cover ring-1 ring-black/5" />
                      <figcaption className="mt-1.5 text-[12px] text-[#8A96A8]">
                        Photo: {u.media.creditUrl ? <a href={u.media.creditUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold underline underline-offset-2 hover:text-[#EA580C]">{u.media.credit} ↗</a> : u.media.credit}
                      </figcaption>
                    </figure>
                  )}
                  {u.media?.type === 'video' && u.media.videoId && (
                    <div className="mt-4"><YouTubeLite kind="video" id={u.media.videoId} title={u.headline} credit={u.media.credit} /></div>
                  )}

                  {u.marketImpact && (
                    <div className="mt-4 flex gap-3 rounded-xl bg-[#0D1117] p-3.5 text-white">
                      <TrendingUp size={18} className="mt-0.5 shrink-0 text-[#FB923C]" aria-hidden />
                      <div className="text-[14px] leading-relaxed">
                        <span className="font-semibold text-[#FB923C]">Market impact </span>
                        {u.marketRegions.map(r => <span key={r} className="mr-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/80">{r}</span>)}
                        <p className="mt-1 text-white/85">{u.marketImpact}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#F1F3F9] pt-3 text-[12px] text-[#8A96A8]">
                    <span>Source:</span>
                    {u.sources.map(s => (
                      <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer nofollow"
                        className="inline-flex min-h-8 items-center rounded-full bg-[#F4F6FA] px-2.5 font-semibold text-[#4A5568] hover:bg-[#FFEDD5] hover:text-[#C2410C]">{s.name} ↗</a>
                    ))}
                    <button type="button" onClick={() => copy(u.id)} aria-label="Copy link to this update" className={`ml-auto inline-flex min-h-8 items-center gap-1 rounded-full px-2 transition-colors ${copied?.id === u.id ? 'bg-green-50 font-semibold text-green-700' : 'hover:text-[#EA580C]'}`}>
                      {copied?.id === u.id ? <Check size={13} aria-hidden /> : <Link2 size={13} aria-hidden />}
                      <span aria-live="polite">{copied?.id === u.id ? (copied.ok ? 'Link copied' : 'Link in address bar') : 'Link'}</span>
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
