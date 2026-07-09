import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { computePulse, type PulseInput } from '@/lib/pulse';

// Sentiment is an EOD aggregate over the whole universe — recomputing it per
// request would re-scan thousands of rows, so cache for 5 minutes like the
// other market-wide aggregates.
export const revalidate = 300;

export async function GET() {
  try {
    const { data: view, error } = await supabase
      .from('screener_view')
      .select('symbol, price, change_pct, week_high_52, week_low_52')
      .limit(3000);
    if (error) throw error;

    const priced = (view ?? []).filter(
      r => r.price != null && r.price > 0 && r.change_pct != null
    );

    let advances = 0;
    let declines = 0;
    let upperHalf = 0;
    let ranged = 0;
    let nearHigh = 0;
    let nearLow = 0;

    for (const r of priced) {
      if (r.change_pct! > 0) advances++;
      else if (r.change_pct! < 0) declines++;

      const hi = r.week_high_52;
      const lo = r.week_low_52;
      if (hi != null && lo != null && hi > lo) {
        ranged++;
        const pos = (r.price! - lo) / (hi - lo);
        if (pos >= 0.5) upperHalf++;
        if (r.price! >= hi * 0.98) nearHigh++;
        if (r.price! <= lo * 1.02) nearLow++;
      }
    }

    // Headline index = the top-ranked index in the feed (Nifty 50 by convention).
    const { data: idx } = await supabase
      .from('indices')
      .select('change_pct, updated_at')
      .order('rank', { ascending: true })
      .limit(1);
    const indexChangePct: number | null = idx?.[0]?.change_pct ?? null;

    const { data: latest } = await supabase
      .from('prices')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);
    const asOf: string | null = latest?.[0]?.date ?? idx?.[0]?.updated_at ?? null;

    const input: PulseInput = {
      advances,
      declines,
      upperHalf,
      ranged,
      nearHigh,
      nearLow,
      indexChangePct,
      sampleSize: priced.length,
      asOf,
    };

    // Not enough data to be honest about — say so rather than print a fake 50.
    if (priced.length < 20) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({ available: true, ...computePulse(input) });
  } catch {
    return NextResponse.json({ available: false });
  }
}
