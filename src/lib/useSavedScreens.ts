'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'finovo-saved-screens';

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
  window.dispatchEvent(new CustomEvent('finovo-saved-screens-change'));
}

/** User-defined saved filter combinations for the Explorer — device-scoped,
 * no account required (mirrors useWatchlist's storage approach). */
export function useSavedScreens() {
  const [screens, setScreens] = useState<SavedScreen[]>([]);

  useEffect(() => {
    setScreens(read());
    const sync = () => setScreens(read());
    window.addEventListener('finovo-saved-screens-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('finovo-saved-screens-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const save = useCallback((name: string, filters: Record<string, string>, sortKey: string, sortDir: 'asc' | 'desc') => {
    const entry: SavedScreen = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name, filters, sortKey, sortDir,
      createdAt: new Date().toISOString(),
    };
    write([...read(), entry]);
    return entry;
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter(s => s.id !== id));
  }, []);

  return { screens, save, remove };
}
