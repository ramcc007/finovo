import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { TOP_GAINERS, TOP_LOSERS, INDICES, SECTORS } from '@/lib/mock-data';

export async function GET() {
  try {
    // Top gainers from quotes table
    const { data: gainers } = await supabase
      .from('quotes')
      .select('symbol, price, change, change_pct, volume')
      .order('change_pct', { ascending: false })
      .limit(10);

    const { data: losers } = await supabase
      .from('quotes')
      .select('symbol, price, change, change_pct, volume')
      .order('change_pct', { ascending: true })
      .limit(10);

    const { data: active } = await supabase
      .from('quotes')
      .select('symbol, price, change, change_pct, volume')
      .order('volume', { ascending: false })
      .limit(10);

    return NextResponse.json({
      gainers: gainers ?? [],
      losers: losers ?? [],
      active: active ?? [],
      indices: INDICES,
      sectors: SECTORS,
    });
  } catch {
    return NextResponse.json({
      gainers: TOP_GAINERS,
      losers: TOP_LOSERS,
      active: TOP_GAINERS,
      indices: INDICES,
      sectors: SECTORS,
    });
  }
}
