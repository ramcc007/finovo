'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/lib/AuthProvider';

/** Client view of an anonymous visitor's free full-access window. UI only —
 *  the server enforces it independently via getEntitlement(). One shared
 *  store so every consumer sees the same clock and flips at the same moment. */
interface PreviewState {
  resolved: boolean; // /api/preview has answered (or failed)
  expiresAt: number; // epoch ms; 0 = no preview
}

let state: PreviewState = { resolved: false, expiresAt: 0 };
let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function set(next: PreviewState) {
  state = next;
  listeners.forEach(l => l());
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  fetch('/api/preview')
    .then(r => r.json())
    .then((d: { remainingMs?: number }) => {
      const remaining = Math.max(0, Number(d.remainingMs) || 0);
      set({ resolved: true, expiresAt: remaining > 0 ? Date.now() + remaining : 0 });
      if (remaining > 0) {
        timer = setTimeout(() => set({ resolved: true, expiresAt: 0 }), remaining);
      }
    })
    .catch(() => set({ resolved: true, expiresAt: 0 }));
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;
const getServerSnapshot = (): PreviewState => ({ resolved: false, expiresAt: 0 });

export function usePreview() {
  const { user, loading: authLoading } = useAuth();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!authLoading && !user) start();
  }, [authLoading, user]);

  // Signed-in users never get the preview; they resolve from their plan.
  const anon = !authLoading && !user;
  const active = anon && snap.expiresAt > Date.now();
  return {
    active,
    expiresAt: active ? snap.expiresAt : 0,
    // True while we can't yet say whether an anonymous visitor is in the window.
    pending: authLoading || (anon && !snap.resolved),
  };
}

// Test/teardown hook for the timer; not used in app code.
export function _clearPreviewTimer() { if (timer) clearTimeout(timer); }
