'use client';

import { useCallback, useEffect, useState } from 'react';
import { useEntitlement } from '@/lib/useEntitlement';
import { FREE_SAVED_SCREENS_LIMIT } from '@/lib/plans';

const STORAGE_KEY = 'scripwise-saved-screens';

export interface SavedScreen {
  id: string;
  name: string;
  filters: Record<string, string>;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  createdAt: string;
}

function read(): SavedScreen[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(screens: SavedScreen[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(screens));
  window.dispatchEvent(new CustomEvent('scripwise-saved-screens-change'));
}

/** User-defined saved filter combinations for the Explorer — device-scoped,
 * no account required (mirrors useWatchlist's storage approach). Capped at
 * FREE_SAVED_SCREENS_LIMIT for non-Pro users; Pro is unlimited. Soft,
 * client-side cap — there's no server-side store to enforce it against. */
export function useSavedScreens() {
  const ent = useEntitlement();
  const [screens, setScreens] = useState<SavedScreen[]>([]);

  useEffect(() => {
    setScreens(read());
    const sync = () => setScreens(read());
    window.addEventListener('scripwise-saved-screens-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('scripwise-saved-screens-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const atLimit = !ent.active && screens.length >= FREE_SAVED_SCREENS_LIMIT;

  const save = useCallback((name: string, filters: Record<string, string>, sortKey: string, sortDir: 'asc' | 'desc') => {
    const current = read();
    if (!ent.active && current.length >= FREE_SAVED_SCREENS_LIMIT) return null;
    const entry: SavedScreen = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name, filters, sortKey, sortDir,
      createdAt: new Date().toISOString(),
    };
    write([...current, entry]);
    return entry;
  }, [ent.active]);

  const remove = useCallback((id: string) => {
    write(read().filter(s => s.id !== id));
  }, []);

  return { screens, save, remove, atLimit, limit: FREE_SAVED_SCREENS_LIMIT };
}
