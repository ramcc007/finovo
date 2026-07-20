import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Uncached, on-demand read of the `quotes` table for a small explicit symbol
// list — backs the homepage's rotating hero preview. Same freshness ceiling
// as /api/live/indices: end-of-day (the daily EOD job), since the intraday
// NSE quotes cron has been blocked by NSE since ~June 2026.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get('symbols') ?? '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => /^[A-Z0-9&-]{1,20}$/.test(s))
    .slice(0, 20);

  if (!symbols.length) return NextResponse.json({ quotes: [], updatedAt: null, fetchedAt: new Date().toISOString() });

  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('symbol, price, change, change_pct, volume, updated_at')
      .in('symbol', symbols);
    if (error) throw error;

    const updatedAt = (data ?? [])
      .map(d => d.updated_at as string | null)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1) ?? null;

    return NextResponse.json({ quotes: data ?? [], updatedAt, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ quotes: [], updatedAt: null, fetchedAt: new Date().toISOString() });
  }
}
