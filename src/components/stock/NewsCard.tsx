'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface Item { title: string; url: string; source: string; ago: string }

function agoLabel(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** Recent headlines about the company, each credited to and linked to its publisher. */
export default function NewsCard({ symbol, name }: { symbol: string; name: string }) {
  const [items, setItems] = useState<Item[] | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/news`)
      .then(r => r.json())
      .then((d: { items?: { title: string; url: string; source: string; publishedAt: string }[] }) => {
        if (alive) setItems((d.items ?? []).map(i => ({ title: i.title, url: i.url, source: i.source, ago: agoLabel(i.publishedAt) })));
      })
      .catch(() => { if (alive) setItems(null); });
    return () => { alive = false; };
  }, [symbol]);

  if (items === null || (items && items.length === 0)) return null;

  return (
    <section className="card p-5" aria-labelledby="news-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="news-h" className="text-xs font-semibold uppercase tracking-wide text-[#4A5568]">Latest news on {name}</h3>
        <span className="text-[11px] text-[#8A96A8]">Headlines from other publishers, via Google News</span>
      </div>
      {items === undefined ? (
        <div className="mt-4 space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-5 animate-pulse rounded bg-[#EEF1F7]" />)}</div>
      ) : (
        <ul className="mt-3 divide-y divide-[#EDF0F7]">
          {items.map(i => (
            <li key={i.url}>
              <a href={i.url} target="_blank" rel="nofollow noopener noreferrer" className="group flex items-start justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-snug text-[#0D1117] group-hover:text-[#EA580C]">{i.title}</span>
                  <span className="mt-0.5 block text-[11px] text-[#8A96A8]">{i.source} · {i.ago}</span>
                </span>
                <ExternalLink size={14} className="mt-1 shrink-0 text-[#C9CFD9] group-hover:text-[#EA580C]" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-[#8A96A8]">Scripwise does not write or endorse these articles. Information only, not investment advice.</p>
    </section>
  );
}
