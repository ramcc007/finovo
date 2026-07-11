'use client';

import { useCallback, useEffect, useState } from 'react';
import { useEntitlement } from '@/lib/useEntitlement';
import { FREE_WATCHLIST_LIMIT } from '@/lib/plans';

const STORAGE_KEY = 'scripwise-watchlist';

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(symbols: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  // Notify other components mounted in the same tab (storage event only
  // fires for other tabs/windows).
  window.dispatchEvent(new CustomEvent('scripwise-watchlist-change'));
}

/** Device-scoped watchlist (localStorage) — no account required. Capped at
 *  FREE_WATCHLIST_LIMIT for non-Pro users; Pro is unlimited. This is a soft,
 *  client-side cap (there's no server-side watchlist to enforce it against)
 *  — good enough to guide free users toward upgrading, not a security
 *  boundary. */
export function useWatchlist() {
  const ent = useEntitlement();
  const [symbols, setSymbols] = useState<string[]>([]);

  useEffect(() => {
    setSymbols(read());
    const sync = () => setSymbols(read());
    window.addEventListener('scripwise-watchlist-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('scripwise-watchlist-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isWatched = useCallback((symbol: string) => symbols.includes(symbol), [symbols]);
  const atLimit = !ent.active && symbols.length >= FREE_WATCHLIST_LIMIT;

  const add = useCallback((symbol: string) => {
    const current = read();
    if (current.includes(symbol)) return false;
    if (!ent.active && current.length >= FREE_WATCHLIST_LIMIT) return false;
    write([...current, symbol]);
    return true;
  }, [ent.active]);

  const remove = useCallback((symbol: string) => {
    write(read().filter(s => s !== symbol));
  }, []);

  const toggle = useCallback((symbol: string) => {
    const current = read();
    if (current.includes(symbol)) {
      write(current.filter(s => s !== symbol));
      return true;
    }
    if (!ent.active && current.length >= FREE_WATCHLIST_LIMIT) return false;
    write([...current, symbol]);
    return true;
  }, [ent.active]);

  return { symbols, isWatched, add, remove, toggle, atLimit, limit: FREE_WATCHLIST_LIMIT };
}
