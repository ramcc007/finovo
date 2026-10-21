'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { usePreview, resetPreview } from '@/lib/usePreview';

/** Slim bar for anonymous visitors: a countdown while their free full-access
 *  window is open, and, once it has ended, the one-time offer to restart it.
 *  Both states carry the one-time Reset button until it has been used. */
export default function PreviewBanner() {
  const { active, expiresAt, anon, resolved, canReset } = usePreview();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const resetButton = canReset && (
    <button
      type="button"
      disabled={busy}
      onClick={async () => { setBusy(true); await resetPreview(); setBusy(false); }}
      className="inline-flex items-center gap-1 rounded-md bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white font-semibold px-2.5 py-1 transition-colors"
    >
      <RotateCcw size={12} /> Reset timer to 30 min
    </button>
  );

  if (active) {
    const left = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    const mm = Math.floor(left / 60);
    const ss = String(left % 60).padStart(2, '0');
    return (
      <div className="bg-[#FFF7ED] border-b border-[#FED7AA] text-[#9A3412] text-xs sm:text-[13px] px-4 py-2 flex items-center justify-center gap-x-3 gap-y-1.5 flex-wrap text-center">
        <Sparkles size={13} className="shrink-0" />
        <span>
          Everything is unlocked for your first 30 minutes — <span className="font-semibold tabular-nums">{mm}:{ss}</span> left.
        </span>
        {resetButton}
        <Link href="/signup" className="font-semibold underline underline-offset-2 hover:text-[#7C2D12]">
          Sign up free to keep going
        </Link>
      </div>
    );
  }

  // Window over: only worth a bar if there's a restart left to offer.
  if (anon && resolved && canReset) {
    return (
      <div className="bg-[#FFF7ED] border-b border-[#FED7AA] text-[#9A3412] text-xs sm:text-[13px] px-4 py-2 flex items-center justify-center gap-x-3 gap-y-1.5 flex-wrap text-center">
        <span>Your free preview has ended.</span>
        {resetButton}
        <Link href="/signup" className="font-semibold underline underline-offset-2 hover:text-[#7C2D12]">
          Or sign up free
        </Link>
      </div>
    );
  }

  return null;
}
