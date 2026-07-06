import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { computeFinovoScore } from '@/lib/finovoScore';

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
    const [{ data: company }, { data: ratios }, { data: shareholding }] = await Promise.all([
      supabase.from('companies').select('sector').eq('symbol', sym).single(),
      supabase.from('ratios').select('*').eq('symbol', sym).order('date', { ascending: false }).limit(1).single(),
      supabase.from('shareholding').select('pledge_pct').eq('symbol', sym).order('quarter', { ascending: false }).limit(1).single(),
    ]);

    if (!ratios) {
      return NextResponse.json({ available: false });
    }

    // Same-sector peer average for P/E and P/B — the only comparative
    // element in an otherwise threshold-based score.
    let sectorAvgPe: number | null = null;
    let sectorAvgPb: number | null = null;
    if (company?.sector) {
      const { data: peers } = await supabase
        .from('screener_view')
        .select('pe, pb')
        .eq('sector', company.sector)
        .limit(500);
      const pes = (peers ?? []).map(p => p.pe).filter((v): v is number => v != null && v > 0);
      const pbs = (peers ?? []).map(p => p.pb).filter((v): v is number => v != null && v > 0);
      if (pes.length >= 3) sectorAvgPe = pes.reduce((a, b) => a + b, 0) / pes.length;
      if (pbs.length >= 3) sectorAvgPb = pbs.reduce((a, b) => a + b, 0) / pbs.length;
    }

    const result = computeFinovoScore({
      pe: ratios.pe,
      pb: ratios.pb,
      roe: ratios.roe,
      roce: ratios.roce,
      debtToEquity: ratios.debt_to_equity,
      currentRatio: ratios.current_ratio,
      revenueGrowth1Y: ratios.revenue_growth_1y,
      profitGrowth1Y: ratios.profit_growth_1y,
      dividendYield: ratios.dividend_yield,
      pledgePct: shareholding?.pledge_pct ?? null,
      sectorAvgPe,
      sectorAvgPb,
    });

    return NextResponse.json({ available: true, ...result });
  } catch {
    return NextResponse.json({ available: false });
  }
}
