'use client';

import { useEffect } from 'react';

const GAP = 8; // px between the term and its card, and the card and the screen edge
const TOP_CLEAR = 72; // keep cards below the sticky header

/**
 * Glossary hover cards inside the article body (markup from src/lib/enhance.ts) as toggletips:
 * the term is a button with aria-expanded/aria-controls. Click, tap, Enter or Space opens it; a second
 * tap, a tap outside, Escape or moving focus away closes it. On devices with a mouse, hovering also
 * opens it. The card is position: fixed, so opening it never moves the text, and it is placed to stay
 * inside the screen; on phones it is a panel at the bottom of the screen (CSS).
 */
export default function GlossaryCards({ targetId }: { targetId: string }) {
  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root) return;
    const phone = window.matchMedia('(max-width: 640px)');
    const mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
    let open: { btn: HTMLButtonElement; pop: HTMLElement; pinned: boolean } | null = null;
    let hoverTimer: number | undefined;

    const popOf = (btn: HTMLButtonElement) => document.getElementById(btn.getAttribute('aria-controls') ?? '');

    const place = () => {
      if (!open) return;
      const { btn, pop } = open;
      if (phone.matches) {
        pop.style.left = pop.style.top = '';
        return;
      }
      const r = btn.getClientRects()[0] ?? btn.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const w = pop.offsetWidth;
      const h = pop.offsetHeight;
      const left = Math.min(Math.max(GAP, r.left), vw - w - GAP);
      let top = r.top - h - GAP;
      if (top < TOP_CLEAR) top = r.bottom + GAP; // no room above: show below the term
      if (top + h > vh - GAP) top = Math.max(GAP, vh - h - GAP);
      pop.style.left = `${Math.round(left)}px`;
      pop.style.top = `${Math.round(top)}px`;
    };

    const close = (focusBack = false) => {
      if (!open) return;
      const { btn, pop } = open;
      btn.setAttribute('aria-expanded', 'false');
      pop.hidden = true;
      open = null;
      if (focusBack) btn.focus();
    };

    const show = (btn: HTMLButtonElement, pinned: boolean) => {
      const pop = popOf(btn);
      if (!pop) return;
      if (open && open.btn !== btn) close();
      if (open) {
        open.pinned ||= pinned;
        return;
      }
      pop.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      open = { btn, pop, pinned };
      place();
    };

    const termOf = (t: EventTarget | null) =>
      t instanceof Element ? (t.closest('button.gloss-term') as HTMLButtonElement | null) : null;

    const onClick = (e: MouseEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest('.gloss-close')) {
        close(true);
        return;
      }
      const btn = termOf(t);
      if (btn && root.contains(btn)) {
        // Enter and Space on a button arrive here as a click too.
        if (open?.btn === btn && open.pinned) close();
        else show(btn, true);
        return;
      }
      if (open && !(t && open.pop.contains(t))) close();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        close(true);
      }
    };

    const onFocusOut = (e: FocusEvent) => {
      if (!open) return;
      const to = e.relatedTarget;
      const gloss = open.btn.closest('.gloss');
      if (to instanceof Node && gloss?.contains(to)) return;
      if (to === null && open.pinned) return; // tap on plain text or a window switch: wait for the click
      close();
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !mouse.matches) return;
      const gloss = e.target instanceof Element ? e.target.closest('.gloss') : null;
      if (!gloss || !root.contains(gloss)) return;
      window.clearTimeout(hoverTimer);
      const btn = gloss.querySelector<HTMLButtonElement>('button.gloss-term');
      if (btn) show(btn, false);
    };

    const onOut = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !open || open.pinned) return;
      const gloss = open.btn.closest('.gloss');
      if (e.relatedTarget instanceof Node && gloss?.contains(e.relatedTarget)) return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => {
        if (open && !open.pinned) close();
      }, 200);
    };

    // iOS Safari sends no click for taps on plain text, so outside taps are caught on pointerdown.
    const onDown = (e: PointerEvent) => {
      if (!open) return;
      const gloss = open.btn.closest('.gloss');
      if (e.target instanceof Node && gloss?.contains(e.target)) return;
      close();
    };

    const onMove = () => place();

    document.addEventListener('click', onClick);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    root.addEventListener('focusout', onFocusOut);
    root.addEventListener('pointerover', onOver);
    root.addEventListener('pointerout', onOut);
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    return () => {
      window.clearTimeout(hoverTimer);
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      root.removeEventListener('focusout', onFocusOut);
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
      window.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
    };
  }, [targetId]);
  return null;
}
