import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StockPageClient from './StockPageClient';
import StockSeoSummary, { type StockSeoData } from '@/components/seo/StockSeoSummary';
import { pageMeta, BASE_URL } from '@/lib/siteMeta';
import { pageTitle } from '@/lib/liveLinks';

interface Props {
  params: Promise<{ symbol: string }>;
}

// Cached and refreshed every 10 minutes. The live price on the page itself is fetched by the browser, so the cache only
// holds the text below. Pages are built on first request (an empty list), then served from cache.
export const revalidate = 600;
export function generateStaticParams() { return []; }

const SYMBOL_RE = /^[A-Z0-9&-]{1,20}$/;
type Row = Record<string, number | string | null>;
const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && isFinite(Number(v)) ? Number(v) : null);

/** Everything the server-rendered text needs. Returns null only when the symbol is genuinely unknown. */
async function load(sym: string): Promise<StockSeoData | null> {
  if (!SYMBOL_RE.test(sym)) return null;
  const [co, view, prof] = await Promise.all([
    supabase.from('companies').select('name, sector, industry').eq('symbol', sym).maybeSingle(),
    supabase.from('screener_view').select('*').eq('symbol', sym).maybeSingle(),
    supabase.from('company_profiles').select('summary, city, state, employees').eq('symbol', sym).maybeSingle(),
  ]);
  // A database error must not be cached as "no such stock": throw so the previous page keeps being served.
  if (co.error) throw new Error(`companies lookup failed: ${co.error.message}`);
  if (!co.data) return null;
  const v = (view.data ?? {}) as Row;
  const p = (prof.data ?? {}) as Row;
  return {
    symbol: sym, name: String(co.data.name), sector: co.data.sector ?? null, industry: co.data.industry ?? null,
    price: num(v.price), marketCap: num(v.market_cap), pe: num(v.pe), pb: num(v.pb), roe: num(v.roe),
    debtToEquity: num(v.debt_to_equity), dividendYield: num(v.dividend_yield),
    week52High: num(v.week_high_52), week52Low: num(v.week_low_52), promoterPct: num(v.promoter_pct),
    summary: typeof p.summary === 'string' ? p.summary : null, city: typeof p.city === 'string' ? p.city : null,
    state: typeof p.state === 'string' ? p.state : null, employees: num(p.employees),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sym = (await params).symbol.toUpperCase();
  const d = await load(sym);
  if (!d) return { title: 'Stock not found', robots: { index: false, follow: true } };
  const facts: string[] = [];
  if (d.pe) facts.push(`P/E ${d.pe.toFixed(1)}x`);
  if (d.roe) facts.push(`ROE ${d.roe.toFixed(1)}%`);
  const description = `${d.name} (${sym}) on the NSE${d.sector ? `, ${d.sector} sector` : ''}${facts.length ? `: ${facts.join(', ')}` : ''}. Share price, ratios, financial statements, shareholding and the Scripwise Score.`;
  return pageMeta({
    title: pageTitle(`${d.name} (${sym}) Share Price and Financials`),
    description: description.length > 165 ? `${description.slice(0, 160).trimEnd()}…` : description,
    path: `/stocks/${encodeURIComponent(sym)}`,
  });
}

export default async function Page({ params }: Props) {
  const sym = (await params).symbol.toUpperCase();
  const d = await load(sym);
  if (!d) notFound();
  const url = `${BASE_URL}/stocks/${encodeURIComponent(sym)}`;
  const ld = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Stock Explorer', item: `${BASE_URL}/screener` },
        { '@type': 'ListItem', position: 3, name: `${d.name} (${sym})`, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: `${d.name} (${sym}) share price and financials`,
      isPartOf: { '@id': `${BASE_URL}/#website` },
      about: { '@type': 'Corporation', name: d.name, tickerSymbol: `NSE:${sym}`, ...(d.sector ? { industry: d.sector } : {}) },
    },
  ]).replace(/</g, '\\u003c');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <StockPageClient initialName={d.name} />
      <StockSeoSummary d={d} />
    </>
  );
}
