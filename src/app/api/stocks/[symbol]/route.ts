import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { STOCK_TCS, PEERS } from '@/lib/mock-data';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();

  try {
    // Company info
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('*')
      .eq('symbol', sym)
      .single();
    if (compErr) throw compErr;

    // Latest ratios
    const { data: ratios } = await supabase
      .from('ratios')
      .select('*')
      .eq('symbol', sym)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    // Live quote
    const { data: quote } = await supabase
      .from('quotes')
      .select('*')
      .eq('symbol', sym)
      .single();

    // Annual financials (last 5 years)
    const { data: annualFin } = await supabase
      .from('fundamentals')
      .select('*')
      .eq('symbol', sym)
      .eq('period_type', 'annual')
      .order('period', { ascending: false })
      .limit(5);

    // Quarterly financials (last 8 quarters)
    const { data: quarterlyFin } = await supabase
      .from('fundamentals')
      .select('*')
      .eq('symbol', sym)
      .eq('period_type', 'quarterly')
      .order('period', { ascending: false })
      .limit(8);

    // Shareholding (last 4 quarters)
    const { data: shareholding } = await supabase
      .from('shareholding')
      .select('*')
      .eq('symbol', sym)
      .order('quarter', { ascending: false })
      .limit(4);

    return NextResponse.json({
      company,
      quote,
      ratios,
      financials: { annual: annualFin ?? [], quarterly: quarterlyFin ?? [] },
      shareholding: shareholding ?? [],
    });
  } catch {
    // Fallback: return TCS mock data for any symbol while DB is being set up
    return NextResponse.json({
      company: {
        symbol: sym,
        name: STOCK_TCS.name,
        sector: STOCK_TCS.sector,
        industry: STOCK_TCS.industry,
        bse_code: STOCK_TCS.bse,
      },
      quote: {
        symbol: sym,
        price: STOCK_TCS.price,
        change: STOCK_TCS.change,
        change_pct: STOCK_TCS.changePct,
        open: STOCK_TCS.open,
        high: STOCK_TCS.high,
        low: STOCK_TCS.low,
        prev_close: STOCK_TCS.prevClose,
        volume: 38400000,
      },
      ratios: {
        pe: STOCK_TCS.pe,
        pb: STOCK_TCS.pb,
        ev_ebitda: STOCK_TCS.evEbitda,
        dividend_yield: STOCK_TCS.divYield,
        roe: STOCK_TCS.roe,
        roce: STOCK_TCS.roce,
        net_margin: STOCK_TCS.netMargin,
        operating_margin: STOCK_TCS.opMargin,
        debt_to_equity: STOCK_TCS.debtEquity,
        current_ratio: STOCK_TCS.currentRatio,
        quick_ratio: STOCK_TCS.quickRatio,
        market_cap: STOCK_TCS.marketCap,
        week_high_52: STOCK_TCS.weekHigh52,
        week_low_52: STOCK_TCS.weekLow52,
        eps: STOCK_TCS.eps,
      },
      financials: STOCK_TCS.financials,
      shareholding: STOCK_TCS.shareholding,
      peers: PEERS,
    });
  }
}
