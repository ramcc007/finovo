import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { computeTechnicals, type Bar } from '@/lib/technicals';

// Returns, moving averages, RSI, volume and volatility worked out from the stored daily prices.
// Cached for a few minutes: the inputs only change when the live quote job or the end-of-day job writes.
export const revalidate = 300;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const sym = (await params).symbol.toUpperCase();
  if (!/^[A-Z0-9&-]{1,20}$/.test(sym)) return NextResponse.json({ technicals: null });
  try {
    // ~5 years of trading days; newest first so a row cap can only cut the oldest bars.
    const { data, error } = await supabase.from('prices').select('date, high, low, close, volume')
      .eq('symbol', sym).order('date', { ascending: false }).limit(1300);
    if (error) throw error;
    const bars: Bar[] = (data ?? []).map(r => ({ date: String(r.date), close: Number(r.close), high: Number(r.high), low: Number(r.low), volume: Number(r.volume) || 0 }));

    // A live quote from today extends the history by one bar so the figures are not a day behind.
    const { data: q } = await supabase.from('quotes').select('price, high, low, volume, updated_at').eq('symbol', sym).maybeSingle();
    if (q?.updated_at && Number(q.price) > 0) {
      const day = new Date(q.updated_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const newest = bars.reduce((m, b) => (b.date > m ? b.date : m), '');
      if (day > newest) bars.push({ date: day, close: Number(q.price), high: Number(q.high) || Number(q.price), low: Number(q.low) || Number(q.price), volume: Number(q.volume) || 0 });
    }
    return NextResponse.json({ technicals: computeTechnicals(bars) });
  } catch {
    return NextResponse.json({ technicals: null });
  }
}
