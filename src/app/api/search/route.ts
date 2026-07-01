import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SCREENER_STOCKS } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get('q')?.trim() ?? '').slice(0, 50);
  // Strip characters with special meaning in PostgREST's filter-string syntax
  // (comma/parens separate or() clauses; % is the ilike wildcard) so user
  // input can't inject additional filter conditions.
  const q = raw.replace(/[,()%*]/g, '');
  if (q.length < 2) return NextResponse.json([]);

  try {
    const [bySymbol, byName] = await Promise.all([
      supabase.from('companies').select('symbol, name, sector')
        .ilike('symbol', `${q}%`).eq('is_active', true).order('symbol').limit(8),
      supabase.from('companies').select('symbol, name, sector')
        .ilike('name', `%${q}%`).eq('is_active', true).order('symbol').limit(8),
    ]);
    if (bySymbol.error) throw bySymbol.error;
    if (byName.error) throw byName.error;

    const seen = new Set<string>();
    const merged = [...(bySymbol.data ?? []), ...(byName.data ?? [])]
      .filter(r => (seen.has(r.symbol) ? false : (seen.add(r.symbol), true)))
      .slice(0, 8);

    return NextResponse.json(merged);
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
