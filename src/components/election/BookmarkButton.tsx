'use client';

import { useState } from 'react';
import { Bookmark, Check } from 'lucide-react';

/** Browsers cannot add a bookmark from a page, so this shows the shortcut (or opens the share sheet on phones). */
export default function BookmarkButton({ url, title, dark = false }: { url: string; title: string; dark?: boolean }) {
  const [hint, setHint] = useState(false);
  const click = async () => {
    if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title, url }); return; } catch { /* cancelled: fall back to the hint */ }
    }
    setHint(true);
    setTimeout(() => setHint(false), 6000);
  };
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={click}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${dark ? 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20' : 'border border-[#E5E7EB] bg-white text-[#0D1117] hover:border-[#F97316]'}`}>
        {hint ? <Check size={16} aria-hidden /> : <Bookmark size={16} aria-hidden />} Bookmark this page
      </button>
      <span role="status" aria-live="polite" className={`mt-1.5 min-h-4 text-xs ${dark ? 'text-white/70' : 'text-[#4A5568]'}`}>
        {hint ? `Press ${mac ? '⌘ + D' : 'Ctrl + D'} to add it to your bookmarks.` : ''}
      </span>
    </span>
  );
}
