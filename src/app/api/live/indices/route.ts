import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Deliberately uncached (unlike /api/indices, which is fine served a few
// minutes stale) — this backs the ticker bar. Index levels only actually
// change once a day via the EOD archive job; the intraday NSE quotes cron
// that used to refresh this intraday has been blocked by NSE since ~June
// 2026 (see ingest_quotes.py) and currently writes nothing.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('indices')
      .select('symbol, name, last, change, change_pct, volume, rank, updated_at')
      .order('rank', { ascending: true });
    if (error) throw error;

    const updatedAt = (data ?? [])
      .map(d => d.updated_at as string | null)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1) ?? null;

    return NextResponse.json({ indices: data ?? [], updatedAt, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ indices: [], updatedAt: null, fetchedAt: new Date().toISOString() });
  }
}
