import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';
import StockPageClient from './StockPageClient';

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  if (!/^[A-Z0-9&-]{1,20}$/.test(sym)) {
    return { title: 'Stock not found' };
  }

  const [{ data: company }, { data: ratios }] = await Promise.all([
    supabase.from('companies').select('name, sector, industry').eq('symbol', sym).single(),
    supabase.from('ratios').select('pe, roe, market_cap').eq('symbol', sym)
      .order('date', { ascending: false }).limit(1).single(),
  ]);

  if (!company) {
    return { title: 'Stock not found' };
  }

  const title = `${company.name} (${sym}) Share Price, Financials & Scorecard`;
  const facts: string[] = [];
  if (ratios?.pe) facts.push(`P/E ${ratios.pe.toFixed(1)}x`);
  if (ratios?.roe) facts.push(`ROE ${ratios.roe.toFixed(1)}%`);
  const factsStr = facts.length ? ` — ${facts.join(', ')}` : '';
  const sectorStr = company.sector ? ` in the ${company.sector} sector` : '';
  const description = `${company.name} (${sym}) stock analysis on NSE${sectorStr}${factsStr}. Live price, financial ratios, Scripwise Score, and multi-year financial statements.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function Page({ params }: Props) {
  const sym = (await params).symbol.toUpperCase();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  let name: string | null = null;
  if (/^[A-Z0-9&-]{1,20}$/.test(sym)) {
    const { data } = await supabase.from('companies').select('name').eq('symbol', sym).single();
    name = data?.name ?? null;
  }
  const base = 'https://www.scripwise.co.in';
  const ld = name ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: base },
      { '@type': 'ListItem', position: 2, name: 'Stock Explorer', item: `${base}/screener` },
      { '@type': 'ListItem', position: 3, name: `${name} (${sym})`, item: `${base}/stocks/${encodeURIComponent(sym)}` },
    ],
  }).replace(/</g, '\\u003c') : null;
  return (
    <>
      {ld && <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld }} />}
      <StockPageClient />
    </>
  );
}
