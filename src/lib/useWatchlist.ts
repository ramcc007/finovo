'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'finovo-watchlist';

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
  window.dispatchEvent(new CustomEvent('finovo-watchlist-change'));
}

/** Device-scoped watchlist (localStorage) — no account required. */
export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>([]);

  useEffect(() => {
    setSymbols(read());
    const sync = () => setSymbols(read());
    window.addEventListener('finovo-watchlist-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('finovo-watchlist-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isWatched = useCallback((symbol: string) => symbols.includes(symbol), [symbols]);

  const add = useCallback((symbol: string) => {
    const current = read();
    if (current.includes(symbol)) return;
    write([...current, symbol]);
  }, []);

  const remove = useCallback((symbol: string) => {
    write(read().filter(s => s !== symbol));
  }, []);

  const toggle = useCallback((symbol: string) => {
    const current = read();
    write(current.includes(symbol) ? current.filter(s => s !== symbol) : [...current, symbol]);
  }, []);

  return { symbols, isWatched, add, remove, toggle };
}
