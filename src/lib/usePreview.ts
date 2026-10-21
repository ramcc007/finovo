'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/lib/AuthProvider';

/** Client view of an anonymous visitor's free full-access window. UI only —
 *  the server enforces it independently via getEntitlement(). One shared
 *  store so every consumer sees the same clock and flips at the same moment. */
interface PreviewState {
  resolved: boolean; // /api/preview has answered (or failed)
  expiresAt: number; // epoch ms; 0 = no preview
  canReset: boolean; // the one-time restart hasn't been used yet
}

let state: PreviewState = { resolved: false, expiresAt: 0, canReset: false };
let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function set(next: PreviewState) {
  state = next;
  listeners.forEach(l => l());
}

function apply(remainingMs: number, canReset: boolean) {
  if (timer) clearTimeout(timer);
  const remaining = Math.max(0, Number(remainingMs) || 0);
  set({ resolved: true, expiresAt: remaining > 0 ? Date.now() + remaining : 0, canReset });
  if (remaining > 0) {
    timer = setTimeout(() => set({ ...state, expiresAt: 0 }), remaining);
  }
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  fetch('/api/preview')
    .then(r => r.json())
    .then((d: { remainingMs?: number; canReset?: boolean }) => apply(d.remainingMs ?? 0, !!d.canReset))
    .catch(() => set({ resolved: true, expiresAt: 0, canReset: false }));
}

/** Spend the one-time restart. Resolves true if the server granted it. */
export async function resetPreview(): Promise<boolean> {
  try {
    const r = await fetch('/api/preview', { method: 'POST' });
    if (!r.ok) {
      set({ ...state, canReset: false });
      return false;
    }
    const d = (await r.json()) as { remainingMs?: number };
    apply(d.remainingMs ?? 0, false);
    return true;
  } catch {
    return false;
  }
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;
const SERVER_STATE: PreviewState = { resolved: false, expiresAt: 0, canReset: false };
const getServerSnapshot = (): PreviewState => SERVER_STATE;

export function usePreview() {
  const { user, loading: authLoading } = useAuth();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!authLoading && !user) start();
  }, [authLoading, user]);

  // Signed-in users never get the preview; they resolve from their plan.
  const anon = !authLoading && !user;
  const active = anon && snap.expiresAt > 0;
  return {
    active,
    expiresAt: active ? snap.expiresAt : 0,
    anon,
    resolved: snap.resolved,
    canReset: anon && snap.canReset,
    // True while we can't yet say whether an anonymous visitor is in the window.
    pending: authLoading || (anon && !snap.resolved),
  };
}

// Test/teardown hook for the timer; not used in app code.
export function _clearPreviewTimer() { if (timer) clearTimeout(timer); }
