'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, RotateCcw } from 'lucide-react';
import { usePreview, resetPreview } from '@/lib/usePreview';

/** Out-of-flow wrapper for the bar. It reserves the bar's height as body
 *  padding, i.e. below everything else on the page, so nothing above moves. */
function BottomBar({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const body = document.body;
    const sync = () => { body.style.paddingBottom = `${el.offsetHeight}px`; };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => { ro.disconnect(); body.style.paddingBottom = ''; };
  }, []);
  return (
    <aside
      ref={ref}
      aria-label="Free preview"
      className="fixed inset-x-0 bottom-0 z-40 bg-[#FFF7ED] border-t border-[#FED7AA] text-[#9A3412] text-xs sm:text-[13px] px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-x-3 gap-y-1.5 flex-wrap text-center shadow-[0_-4px_16px_rgba(16,24,40,0.06)]"
    >
      {children}
    </aside>
  );
}

/** Fixed to the bottom of the viewport, so it never pushes the page down when
 *  it appears after hydration (it used to sit above the header in normal flow,
 *  which was the main Cumulative Layout Shift on the home page). Body padding
 *  equal to its height keeps the end of the footer reachable.
 *
 *  Slim bar for anonymous visitors: a countdown while their free full-access
 *  window is open, and, once it has ended, the one-time offer to restart it.
 *  The Reset button is offered only once the window has ended (and only if
 *  the reset hasn't been used in the last 7 days). */
export default function PreviewBanner() {
  const pathname = usePathname();
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
      <RotateCcw size={12} aria-hidden="true" /> Reset timer to 30 min
    </button>
  );

  // Blog pages are public reading content — no preview banner there.
  if (pathname === '/blog' || pathname?.startsWith('/blog/') || pathname === '/glossary' || pathname?.startsWith('/glossary/')) return null;

  if (active) {
    const left = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    const mm = Math.floor(left / 60);
    const ss = String(left % 60).padStart(2, '0');
    return (
      <BottomBar>
        <Sparkles size={13} className="shrink-0" aria-hidden="true" />
        <span>
          Everything is unlocked for your first 30 minutes — <span className="font-semibold tabular-nums">{mm}:{ss}</span> left.
        </span>
        <Link href="/signup" className="inline-block py-1 font-semibold underline underline-offset-2 hover:text-[#7C2D12]">
          Sign up free to keep going
        </Link>
      </BottomBar>
    );
  }

  // Window over: only worth a bar if there's a restart left to offer.
  if (anon && resolved && canReset) {
    return (
      <BottomBar>
        <span>Your free preview has ended.</span>
        {resetButton}
        <Link href="/signup" className="font-semibold underline underline-offset-2 hover:text-[#7C2D12]">
          Or sign up free
        </Link>
      </BottomBar>
    );
  }

  return null;
}
