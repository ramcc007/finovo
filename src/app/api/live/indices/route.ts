import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Deliberately uncached (unlike /api/indices, which is fine served a few
// minutes stale) — this backs the ticker bar, which we want to reflect the
// freshest row our NSE-quotes cron has written the instant the page loads.
// The underlying data is still only as fresh as that cron (every 5 min
// during market hours, itself ~15 min delayed per NSE) — this route just
// removes our own extra layer of staleness on top of that.
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
