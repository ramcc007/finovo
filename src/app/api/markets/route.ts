import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 0;

interface Row {
  symbol: string;
  name: string;
  sector: string | null;
  market_cap: number | null;
  week_high_52: number | null;
  week_low_52: number | null;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  volume: number | null;
}

const slim = (r: Row) => ({
  symbol: r.symbol,
  name: r.name,
  sector: r.sector,
  price: r.price,
  change: r.change,
  change_pct: r.change_pct,
  volume: r.volume,
  market_cap: r.market_cap,
});

export async function GET() {
  try {
    // screener_view already joins companies + latest ratios + quote, deduped to
    // the latest row per symbol (name, sector, market cap, 52w range, change %).
    const { data: view, error: viewErr } = await supabase
      .from('screener_view')
      .select('symbol, name, sector, market_cap, week_high_52, week_low_52, price, change_pct')
      .limit(2000);
    if (viewErr) throw viewErr;

    // quotes carries the raw EOD volume + absolute change not present in the view.
    const { data: quotes, error: qErr } = await supabase
      .from('quotes')
      .select('symbol, volume, change, price, change_pct');
    if (qErr) throw qErr;

    // Latest trading day represented in the price feed.
    const { data: latest } = await supabase
      .from('prices')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);
    const tradeDate: string | null = latest?.[0]?.date ?? null;

    const qmap = new Map<string, { volume: number | null; change: number | null; price: number | null; change_pct: number | null }>();
    for (const q of quotes ?? []) qmap.set(q.symbol, q);

    const rows: Row[] = (view ?? []).map(v => {
      const q = qmap.get(v.symbol);
      return {
        symbol: v.symbol,
        name: v.name,
        sector: v.sector,
        market_cap: v.market_cap,
        week_high_52: v.week_high_52,
        week_low_52: v.week_low_52,
        price: q?.price ?? v.price,
        change: q?.change ?? null,
        change_pct: v.change_pct ?? q?.change_pct ?? null,
        volume: q?.volume ?? null,
      };
    });

    // Only rows with a real, priced quote count toward movers / breadth.
    const priced = rows.filter(r => r.price != null && r.price > 0 && r.change_pct != null);

    const byChangeDesc = [...priced].sort((a, b) => (b.change_pct! - a.change_pct!));
    const gainers = byChangeDesc.filter(r => r.change_pct! > 0).slice(0, 12).map(slim);
    const losers = [...priced].filter(r => r.change_pct! < 0)
      .sort((a, b) => a.change_pct! - b.change_pct!).slice(0, 12).map(slim);
    const active = [...priced].filter(r => r.volume != null)
      .sort((a, b) => (b.volume! - a.volume!)).slice(0, 12).map(slim);

    // Near 52-week extremes (within 2% of the band edge).
    const high52 = priced
      .filter(r => r.week_high_52 && r.price! >= r.week_high_52 * 0.98)
      .map(r => ({ ...slim(r), proximity: r.price! / r.week_high_52! }))
      .sort((a, b) => b.proximity - a.proximity).slice(0, 12);
    const low52 = priced
      .filter(r => r.week_low_52 && r.price! <= r.week_low_52 * 1.02)
      .map(r => ({ ...slim(r), proximity: r.price! / r.week_low_52! }))
      .sort((a, b) => a.proximity - b.proximity).slice(0, 12);

    // Sector performance: mean change % per sector (sectors with >= 3 stocks).
    const sectorAgg = new Map<string, { sum: number; n: number }>();
    for (const r of priced) {
      if (!r.sector) continue;
      const a = sectorAgg.get(r.sector) ?? { sum: 0, n: 0 };
      a.sum += r.change_pct!; a.n += 1;
      sectorAgg.set(r.sector, a);
    }
    const sectors = [...sectorAgg.entries()]
      .filter(([, a]) => a.n >= 3)
      .map(([name, a]) => ({ name, change: +(a.sum / a.n).toFixed(2), count: a.n }))
      .sort((a, b) => b.change - a.change);

    // Market breadth.
    const advances = priced.filter(r => r.change_pct! > 0).length;
    const declines = priced.filter(r => r.change_pct! < 0).length;
    const unchanged = priced.filter(r => r.change_pct === 0).length;

    return NextResponse.json({
      tradeDate,
      total: priced.length,
      gainers, losers, active, high52, low52, sectors,
      breadth: { advances, declines, unchanged, high52: high52.length, low52: low52.length },
    });
  } catch {
    // No fabricated fallback — surface empty so the UI shows an honest empty state.
    return NextResponse.json({
      tradeDate: null, total: 0,
      gainers: [], losers: [], active: [], high52: [], low52: [], sectors: [],
      breadth: { advances: 0, declines: 0, unchanged: 0, high52: 0, low52: 0 },
    });
  }
}
