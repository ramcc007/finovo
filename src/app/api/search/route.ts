import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SCREENER_STOCKS } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q')?.trim() ?? '').slice(0, 50);
  if (q.length < 2) return NextResponse.json([]);

  try {
    const { data, error } = await supabase
      .from('companies')
      .select('symbol, name, sector')
      .or(`symbol.ilike.${q}%,name.ilike.%${q}%`)
      .eq('is_active', true)
      .order('symbol')
      .limit(8);

    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    // Fallback to mock data
    const lower = q.toLowerCase();
    const results = SCREENER_STOCKS
      .filter(s => s.symbol.toLowerCase().includes(lower) || s.name.toLowerCase().includes(lower))
      .slice(0, 8)
      .map(s => ({ symbol: s.symbol, name: s.name, sector: s.sector }));
    return NextResponse.json(results);
  }
}
