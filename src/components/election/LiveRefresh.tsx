'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

const POLL_MS = 120_000;

/** Checks the cached JSON feed every two minutes while the tab is open and offers to load newer updates. */
export default function LiveRefresh({ latestIso, enabled }: { latestIso: string | null; enabled: boolean }) {
  const router = useRouter();
  const [fresh, setFresh] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const r = await fetch('/us-midterm-elections/feed.json', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json() as { items?: { date_published?: string }[] };
        const since = latestIso ? Date.parse(latestIso) : 0;
        setFresh((d.items ?? []).filter(i => i.date_published && Date.parse(i.date_published) > since).length);
      } catch { /* try again next time */ }
    };
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [latestIso, enabled]);

  if (fresh === 0) return null;
  return (
    <button type="button" onClick={() => { setFresh(0); router.refresh(); window.scrollTo({ top: document.getElementById('timeline')?.offsetTop ?? 0, behavior: 'smooth' }); }}
      className="fixed left-1/2 top-20 z-40 inline-flex min-h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-[#F97316] px-5 text-sm font-bold text-white shadow-xl ring-4 ring-white/60 hover:bg-[#EA580C]">
      <ArrowUp size={16} aria-hidden /> {fresh} new update{fresh === 1 ? '' : 's'}
    </button>
  );
}
