import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { computeScripwiseScore } from '@/lib/scripwiseScore';
import { getEntitlement, isWithinAnonPreview } from '@/lib/entitlement';

function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

/** Last day of each of the last 12 calendar months, oldest first, as
 * YYYY-MM-DD — used both as the month key and as the upper bound when
 * picking a representative EOD price for months with no real snapshot. */
function lastTwelveMonthEnds(): { key: string; monthEnd: string }[] {
  const out: { key: string; monthEnd: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); // last day of that month
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ key, monthEnd: d.toISOString().slice(0, 10) });
  }
  return out;
}

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
    const months = lastTwelveMonthEnds();
    const twelveMonthsAgo = months[0].key + '-01';

    const [{ data: company }, { data: ratiosRows }, { data: priceRows }] = await Promise.all([
      supabase.from('companies').select('sector').eq('symbol', sym).single(),
      supabase.from('ratios')
        .select('date, pe, pb, eps, roe, roce, debt_to_equity, current_ratio, revenue_growth_1y, profit_growth_1y, dividend_yield')
        .eq('symbol', sym)
        .gte('date', twelveMonthsAgo)
        .order('date', { ascending: false }),
      supabase.from('prices')
        .select('date, close')
        .eq('symbol', sym)
        .gte('date', twelveMonthsAgo)
        .order('date', { ascending: false }),
    ]);

    // Ratios are captured weekly, not monthly — real snapshots naturally
    // cluster in whichever recent months ingestion has actually run in.
    // Keep the latest real snapshot per month as the source of truth for
    // any month that has one.
    const realByMonth = new Map<string, NonNullable<typeof ratiosRows>[number]>();
    for (const r of ratiosRows ?? []) {
      const key = monthKeyOf(r.date as string);
      if (!realByMonth.has(key)) realByMonth.set(key, r); // date-desc, so first hit is latest
    }

    // For months with no real snapshot, approximate P/E and P/B from that
    // month's closing price against the most recent trailing EPS and book
    // value per share — the only two score inputs that are meaningfully
    // point-in-time; everything else (ROE, growth, debt/equity, dividend
    // yield) is quarterly/annual and effectively static across a few weeks
    // regardless, so pinning them to the latest reported figures isn't a
    // meaningful approximation, it's what a real snapshot would show too.
    const latestReal = (ratiosRows ?? [])[0] ?? null;
    const latestEps = latestReal?.eps ?? null;
    // Book value per share = price / P/B. Ratios doesn't carry a raw price
    // column, so derive it from the most recent EOD close instead.
    const priceByDate = new Map<string, number>();
    for (const p of priceRows ?? []) priceByDate.set(p.date as string, p.close as number);
    const latestPrice = (priceRows ?? [])[0]?.close ?? null;
    const bvps = latestPrice && latestReal?.pb ? latestPrice / latestReal.pb : null;

    const pricesDesc = (priceRows ?? []) as { date: string; close: number }[];
    const closestPriceOnOrBefore = (targetDate: string): number | null => {
      for (const p of pricesDesc) {
        if (p.date <= targetDate) return p.close;
      }
      return null;
    };

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

    const points: { date: string; score: number; approx: boolean }[] = [];
    for (const { key, monthEnd } of months) {
      const real = realByMonth.get(key);
      if (real) {
        points.push({
          date: real.date as string,
          approx: false,
          score: computeScripwiseScore({
            pe: real.pe, pb: real.pb, roe: real.roe, roce: real.roce,
            debtToEquity: real.debt_to_equity, currentRatio: real.current_ratio,
            revenueGrowth1Y: real.revenue_growth_1y, profitGrowth1Y: real.profit_growth_1y,
            dividendYield: real.dividend_yield,
            pledgePct: null,
            sectorAvgPe, sectorAvgPb,
          }).score,
        });
        continue;
      }

      // No real snapshot for this month — approximate from that month's
      // closing price, if we have one and a baseline to compare it to.
      const priceThatMonth = priceByDate.get(monthEnd) ?? closestPriceOnOrBefore(monthEnd);
      if (!priceThatMonth || !latestReal) continue; // nothing to approximate from
      const approxPe = latestEps && latestEps > 0 ? priceThatMonth / latestEps : null;
      const approxPb = bvps && bvps > 0 ? priceThatMonth / bvps : null;

      points.push({
        date: monthEnd,
        approx: true,
        score: computeScripwiseScore({
          pe: approxPe, pb: approxPb,
          roe: latestReal.roe, roce: latestReal.roce,
          debtToEquity: latestReal.debt_to_equity, currentRatio: latestReal.current_ratio,
          revenueGrowth1Y: latestReal.revenue_growth_1y, profitGrowth1Y: latestReal.profit_growth_1y,
          dividendYield: latestReal.dividend_yield,
          pledgePct: null,
          sectorAvgPe, sectorAvgPb,
        }).score,
      });
    }

    if (points.length < 2) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({ available: true, points });
  } catch {
    return NextResponse.json({ available: false });
  }
}
