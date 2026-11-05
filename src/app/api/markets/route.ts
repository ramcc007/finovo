import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Quotes refresh about every 2 minutes in market hours (largest companies) and once at the
// end of day for the rest. Cache the aggregate for a minute instead of re-scanning
// ~4,400 rows (screener_view + quotes) per request.
export const revalidate = 60;

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

const INDEX_TABS = [
  { key: 'sensex', indexSymbol: 'SENSEX' },
  { key: 'nifty50', indexSymbol: 'Nifty 50' },
  { key: 'midcap100', indexSymbol: 'NIFTY Midcap 100' },
  { key: 'smallcap100', indexSymbol: 'NIFTY Smallcap 100' },
] as const;

// The API returns at most 1000 rows per request, however large `.limit()` is. A plain select of
// ~2,650 stocks therefore saw only the first thousand, in no useful order. Page through all rows,
// ordered by symbol so the pages are stable.
async function fetchAll<T>(table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let start = 0; start < 20_000; start += 1000) {
    const { data, error } = await supabase.from(table).select(cols).order('symbol').range(start, start + 999);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export async function GET() {
  try {
    // screener_view already joins companies + latest ratios + quote, deduped to
    // the latest row per symbol (name, sector, market cap, 52w range, change %).
    type ViewRow = { symbol: string; name: string; sector: string | null; market_cap: number | null; week_high_52: number | null; week_low_52: number | null; price: number | null; change_pct: number | null };
    type QuoteRow = { symbol: string; volume: number | null; change: number | null; price: number | null; change_pct: number | null; updated_at: string | null };
    // quotes carries the raw EOD volume + absolute change not present in the view.
    const [view, quotes] = await Promise.all([
      fetchAll<ViewRow>('screener_view', 'symbol, name, sector, market_cap, week_high_52, week_low_52, price, change_pct'),
      fetchAll<QuoteRow>('quotes', 'symbol, volume, change, price, change_pct, updated_at'),
    ]);

    // Latest trading day represented in the price feed.
    const { data: latest } = await supabase
      .from('prices')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);
    const tradeDate: string | null = latest?.[0]?.date ?? null;

    // During a session only the largest companies are live, the rest still hold the last close.
    // Mixing the two would blend today's moves with yesterday's, so movers and breadth use only
    // quotes from the most recent trading day (IST) present in the table.
    const istDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '');
    const updatedAt = (quotes ?? []).map(q => q.updated_at as string | null).filter((x): x is string => !!x).sort().at(-1) ?? null;
    const latestDay = istDay(updatedAt);

    type Q = { volume: number | null; change: number | null; price: number | null; change_pct: number | null; updated_at: string | null };
    const qmap = new Map<string, Q>();
    const qAll = new Map<string, Q>();
    for (const q of quotes ?? []) {
      qAll.set(q.symbol, q);
      if (istDay(q.updated_at) === latestDay) qmap.set(q.symbol, q);
    }

    const rows: Row[] = (view ?? []).filter(v => qmap.has(v.symbol)).map(v => {
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
        change_pct: q?.change_pct ?? v.change_pct ?? null,
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

    // Index tabs: every member of Sensex / Nifty 50 / Midcap 100 / Smallcap 100 with its latest quote,
    // largest first. These are not limited to the latest trading day; `live` says how many are current.
    const viewBySymbol = new Map((view ?? []).map(v => [v.symbol as string, v]));
    const [{ data: members }, { data: levels }] = await Promise.all([
      supabase.from('index_members').select('index_key, symbol'),
      supabase.from('indices').select('symbol, last, change, change_pct'),
    ]);
    const levelBySymbol = new Map((levels ?? []).map(l => [l.symbol as string, l]));
    const indexTabs: Record<string, { rows: ReturnType<typeof slim>[]; total: number; live: number; level: { last: number; change: number | null; change_pct: number | null } | null }> = {};
    for (const t of INDEX_TABS) {
      const syms = (members ?? []).filter(m => m.index_key === t.key).map(m => m.symbol as string);
      const list: Row[] = [];
      let live = 0;
      for (const sym of syms) {
        const v = viewBySymbol.get(sym);
        const q = qAll.get(sym);
        if (!v || !q || !(q.price != null && q.price > 0)) continue;
        if (istDay(q.updated_at) === latestDay) live++;
        list.push({
          symbol: sym, name: v.name, sector: v.sector, market_cap: v.market_cap,
          week_high_52: v.week_high_52, week_low_52: v.week_low_52,
          price: q.price, change: q.change, change_pct: q.change_pct ?? v.change_pct ?? null, volume: q.volume,
        });
      }
      list.sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0));
      const lv = levelBySymbol.get(t.indexSymbol);
      indexTabs[t.key] = {
        rows: list.map(slim), total: syms.length, live,
        level: lv ? { last: Number(lv.last), change: lv.change == null ? null : Number(lv.change), change_pct: lv.change_pct == null ? null : Number(lv.change_pct) } : null,
      };
    }

    return NextResponse.json({
      tradeDate,
      updatedAt,
      indexTabs,
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
