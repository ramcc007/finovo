import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { computeScripwiseScore } from '@/lib/scripwiseScore';
import { getEntitlement, isWithinAnonPreview } from '@/lib/entitlement';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  // Score History is a Scorecard (Pro) feature end-to-end — no partial data,
  // except during a first-time anonymous visitor's 3-minute preview window
  // (matches score/route.ts, since both render inside the same card).
  const ent = await getEntitlement(req);
  if (!ent.active && !(!ent.userId && isWithinAnonPreview(req))) {
    return NextResponse.json({ available: false, locked: true });
  }

  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  if (!/^[A-Z0-9&-]{1,20}$/.test(sym)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [{ data: company }, { data: rows }] = await Promise.all([
      supabase.from('companies').select('sector').eq('symbol', sym).single(),
      supabase.from('ratios')
        .select('date, pe, pb, roe, roce, debt_to_equity, current_ratio, revenue_growth_1y, profit_growth_1y, dividend_yield')
        .eq('symbol', sym)
        .gte('date', twelveMonthsAgo.toISOString().slice(0, 10))
        .order('date', { ascending: false }),
    ]);

    // Ratios are captured weekly, not monthly — collapsing to the latest
    // snapshot per calendar month gives a real 12-month trend instead of a
    // dozen near-identical points from the last ~8 weeks all clustered in
    // the current month.
    const latestByMonth = new Map<string, NonNullable<typeof rows>[number]>();
    for (const r of rows ?? []) {
      const monthKey = (r.date as string).slice(0, 7); // YYYY-MM
      if (!latestByMonth.has(monthKey)) latestByMonth.set(monthKey, r); // rows are date-desc, so first hit per month is the latest
    }
    const history = [...latestByMonth.values()].sort((a, b) => (a.date as string).localeCompare(b.date as string));

    if (history.length < 2) {
      return NextResponse.json({ available: false });
    }

    // Same-sector P/E & P/B averages, computed from today's peer set — the
    // score's one comparative input isn't tracked historically, so every
    // point in the trend is scored against the current sector, not the
    // sector as it stood on that date.
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

    const points = history.map(r => ({
      date: r.date as string,
      score: computeScripwiseScore({
        pe: r.pe, pb: r.pb, roe: r.roe, roce: r.roce,
        debtToEquity: r.debt_to_equity, currentRatio: r.current_ratio,
        revenueGrowth1Y: r.revenue_growth_1y, profitGrowth1Y: r.profit_growth_1y,
        dividendYield: r.dividend_yield,
        // Pledge history isn't tracked per ratios date — omit rather than
        // apply today's pledge % to a past quarter.
        pledgePct: null,
        sectorAvgPe, sectorAvgPb,
      }).score,
    }));

    return NextResponse.json({ available: true, points });
  } catch {
    return NextResponse.json({ available: false });
  }
}
