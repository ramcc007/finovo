'use client';

import { useEffect, useState } from 'react';

/** A thin bar at the top of the window that fills as the reader moves through the article. */
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setPct(total <= 0 ? 100 : Math.min(100, Math.max(0, (-r.top / total) * 100)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetId]);
  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent">
      <div className="h-full bg-[#F97316] transition-[width] duration-100" style={{ width: `${pct}%` }} />
    </div>
  );
}
