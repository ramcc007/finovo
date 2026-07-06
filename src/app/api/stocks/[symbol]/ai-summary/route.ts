import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase, getServiceClient } from '@/lib/supabase';

// How long a cached summary is considered fresh before we regenerate it.
// Fundamentals only update weekly, so daily regeneration would be wasted spend.
const CACHE_DAYS = 14;
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

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
    const { data: cached } = await supabase
      .from('ai_summaries')
      .select('summary, generated_at')
      .eq('symbol', sym)
      .single();

    if (cached) {
      const ageMs = Date.now() - new Date(cached.generated_at).getTime();
      if (ageMs < CACHE_DAYS * 86400000) {
        return NextResponse.json({ summary: cached.summary, generated_at: cached.generated_at, cached: true });
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Not configured — degrade gracefully rather than error the page.
      return NextResponse.json({ summary: cached?.summary ?? null, unavailable: true });
    }

    const [{ data: company }, { data: ratios }] = await Promise.all([
      supabase.from('companies').select('name, sector, industry').eq('symbol', sym).single(),
      supabase.from('ratios').select('*').eq('symbol', sym).order('date', { ascending: false }).limit(1).single(),
    ]);

    if (!company) {
      return NextResponse.json({ summary: null, unavailable: true });
    }

    const facts = [
      `Company: ${company.name} (${sym})`,
      company.sector ? `Sector: ${company.sector}` : null,
      company.industry ? `Industry: ${company.industry}` : null,
      ratios?.market_cap != null ? `Market cap: ₹${ratios.market_cap.toLocaleString('en-IN')} Cr` : null,
      ratios?.pe != null ? `P/E: ${ratios.pe}` : null,
      ratios?.pb != null ? `P/B: ${ratios.pb}` : null,
      ratios?.roe != null ? `ROE: ${ratios.roe}%` : null,
      ratios?.roce != null ? `ROCE: ${ratios.roce}%` : null,
      ratios?.net_margin != null ? `Net margin: ${ratios.net_margin}%` : null,
      ratios?.debt_to_equity != null ? `Debt/Equity: ${ratios.debt_to_equity}` : null,
      ratios?.revenue_growth_1y != null ? `Revenue growth (1Y): ${ratios.revenue_growth_1y}%` : null,
      ratios?.profit_growth_1y != null ? `Profit growth (1Y): ${ratios.profit_growth_1y}%` : null,
      ratios?.dividend_yield != null ? `Dividend yield: ${ratios.dividend_yield}%` : null,
      ratios?.week_high_52 != null && ratios?.week_low_52 != null
        ? `52-week range: ₹${ratios.week_low_52} – ₹${ratios.week_high_52}` : null,
    ].filter(Boolean).join('\n');

    const anthropic = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    const response = await anthropic.messages.create({
      model,
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are a financial data analyst writing a short, neutral summary for a stock research tool. Using ONLY the facts below, write a 100-150 word plain-English reading of this company's fundamentals: valuation, profitability, growth, and financial health. Do not recommend buying or selling, do not speculate beyond the data given, and do not invent numbers not listed below. If a metric is missing, don't mention it.

${facts}`,
      }],
    });

    const summary = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { text: string }).text)
      .join(' ')
      .trim();

    if (!summary) {
      return NextResponse.json({ summary: cached?.summary ?? null, unavailable: true });
    }

    const generated_at = new Date().toISOString();
    const serviceClient = getServiceClient();
    await serviceClient.from('ai_summaries').upsert(
      { symbol: sym, summary, model, generated_at },
      { onConflict: 'symbol' }
    );

    return NextResponse.json({ summary, generated_at, cached: false });
  } catch {
    return NextResponse.json({ summary: null, unavailable: true });
  }
}
