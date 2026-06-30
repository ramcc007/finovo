import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const period = req.nextUrl.searchParams.get('period') ?? '1Y';

  const daysMap: Record<string, number> = {
    '1D': 1, '1W': 7, '1M': 30, '6M': 180, '1Y': 365, '5Y': 1825, 'All': 3650,
  };
  const days = daysMap[period] ?? 365;
  const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  try {
    // Order descending + explicit limit so that if the server's row cap is
    // ever hit, we lose the oldest days rather than silently dropping the
    // most recent ones (which is what the chart and % change calc need).
    const { data, error } = await supabase
      .from('prices')
      .select('date, open, high, low, close, volume')
      .eq('symbol', symbol.toUpperCase())
      .gte('date', from)
      .order('date', { ascending: false })
      .limit(days);

    if (error) throw error;
    return NextResponse.json((data ?? []).reverse());
  } catch {
    return NextResponse.json([]);
  }
}
