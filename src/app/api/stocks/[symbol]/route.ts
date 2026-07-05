import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatCrores } from '@/lib/utils';


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  if (!/^[A-Z0-9&-]{1,20}$/.test(sym)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  try {
    // All lookups are independent — run them in parallel instead of paying
    // six sequential round-trips to Supabase before the first byte.
    const [
      { data: company, error: compErr },
      { data: ratios },
      { data: quote },
      { data: annualFin },
      { data: quarterlyFin },
      { data: shareholding },
    ] = await Promise.all([
      supabase.from('companies').select('*').eq('symbol', sym).single(),
      supabase.from('ratios').select('*').eq('symbol', sym)
        .order('date', { ascending: false }).limit(1).single(),
      supabase.from('quotes').select('*').eq('symbol', sym).single(),
      supabase.from('fundamentals').select('*').eq('symbol', sym)
        .eq('period_type', 'annual').order('period', { ascending: false }).limit(5),
      supabase.from('fundamentals').select('*').eq('symbol', sym)
        .eq('period_type', 'quarterly').order('period', { ascending: false }).limit(8),
      supabase.from('shareholding').select('*').eq('symbol', sym)
        .order('quarter', { ascending: false }).limit(4),
    ]);
    if (compErr) throw compErr;

    // Real peer set: largest companies in the same sector.
    let peers: Array<{ symbol: string; name: string; price: number; mcap: string; pe: number; pb: number; roe: number; revGrowth: number }> = [];
    if (company?.sector) {
      const { data: peerRows } = await supabase
        .from('screener_view')
        .select('symbol, name, price, market_cap, pe, pb, roe, revenue_growth_1y')
        .eq('sector', company.sector)
        .order('market_cap', { ascending: false, nullsFirst: false })
        .limit(8);
      peers = (peerRows ?? []).map(p => ({
        symbol: p.symbol,
        name: p.name,
        price: p.price ?? 0,
        mcap: p.market_cap != null ? formatCrores(p.market_cap) : '—',
        pe: p.pe ?? 0,
        pb: p.pb ?? 0,
        roe: p.roe ?? 0,
        revGrowth: p.revenue_growth_1y ?? 0,
      }));
    }

    // If live quote is missing, synthesize from latest ratios price
    const effectiveQuote = quote ?? (ratios?.price ? {
      symbol: sym,
      price: ratios.price,
      change: null,
      change_pct: null,
      open: ratios.price,
      high: ratios.price,
      low: ratios.price,
      prev_close: ratios.price,
      volume: null,
    } : null);

    return NextResponse.json({
      company,
      quote: effectiveQuote,
      ratios,
      financials: { annual: annualFin ?? [], quarterly: quarterlyFin ?? [] },
      shareholding: shareholding ?? [],
      peers,
    });
  } catch {
    return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
  }
}
