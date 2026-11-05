import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatCrores } from '@/lib/utils';
import { computeDerived } from '@/lib/derived';
import { computePeerStats, type PeerRow } from '@/lib/peerStats';

const INDEX_LABEL: Record<string, string> = { sensex: 'Sensex 30', nifty50: 'Nifty 50', midcap100: 'Nifty Midcap 100', smallcap100: 'Nifty Smallcap 100' };


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
      { data: corporateActions },
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
      supabase.from('corporate_actions').select('*').eq('symbol', sym)
        .order('ex_date', { ascending: false, nullsFirst: false }).limit(60),
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

    // Extras are best effort: a missing table or a failed query must never break the page.
    const dataOf = async <T,>(f: () => PromiseLike<{ data: T | null }>): Promise<T | null> => { try { return (await f()).data; } catch { return null; } };
    const countOf = async (f: () => PromiseLike<{ count: number | null }>): Promise<number | null> => { try { return (await f()).count; } catch { return null; } };

    const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    const [profile, members, bulkDeals] = await Promise.all([
      dataOf(() => supabase.from('company_profiles').select('summary, website, employees, city, state, country, officers, source, next_earnings, updated_at').eq('symbol', sym).maybeSingle()),
      dataOf(() => supabase.from('index_members').select('index_key').eq('symbol', sym)),
      dataOf(() => supabase.from('bulk_deals').select('trade_date, client, side, quantity, price, deal_type').eq('symbol', sym).gte('trade_date', since90).order('trade_date', { ascending: false }).limit(20)),
    ]);

    // Where the company sits by market cap: within its sector and overall.
    const mcap: number | null = ratios?.market_cap ?? null;
    let rank: { sector: string | null; sectorRank: number | null; sectorTotal: number | null; overallRank: number | null; overallTotal: number | null } | null = null;
    if (mcap != null && mcap > 0) {
      const sector: string | null = company?.sector ?? null;
      const all = () => supabase.from('screener_view').select('symbol', { count: 'exact', head: true }).gt('market_cap', 0);
      const [sAbove, sTotal, oAbove, oTotal] = await Promise.all([
        sector ? countOf(() => all().eq('sector', sector).gt('market_cap', mcap)) : Promise.resolve(null),
        sector ? countOf(() => all().eq('sector', sector)) : Promise.resolve(null),
        countOf(() => all().gt('market_cap', mcap)),
        countOf(() => all()),
      ]);
      rank = {
        sector, sectorRank: sAbove != null ? sAbove + 1 : null, sectorTotal: sTotal,
        overallRank: oAbove != null ? oAbove + 1 : null, overallTotal: oTotal,
      };
    }

    // Standing among sector peers on valuation, profitability, growth, leverage and yield.
    let peerStats: ReturnType<typeof computePeerStats> = [];
    if (company?.sector) {
      try {
        const rows: PeerRow[] = [];
        for (let start = 0; start < 3000; start += 1000) {
          const { data: chunk } = await supabase.from('screener_view')
            .select('symbol, pe, pb, roe, net_margin, debt_to_equity, revenue_growth_1y, dividend_yield')
            .eq('sector', company.sector).order('symbol').range(start, start + 999);
          rows.push(...((chunk ?? []) as PeerRow[]));
          if (!chunk || chunk.length < 1000) break;
        }
        peerStats = computePeerStats(rows, sym);
      } catch { /* the comparison is an extra */ }
    }

    const derived = computeDerived(annualFin ?? [], mcap);

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
      corporateActions: corporateActions ?? [],
      peers,
      profile: profile ?? null,
      indices: ((members ?? []) as { index_key: string }[]).map(m => INDEX_LABEL[m.index_key]).filter(Boolean),
      rank,
      derived,
      peerStats,
      bulkDeals: bulkDeals ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
  }
}
