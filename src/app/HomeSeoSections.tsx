import Link from 'next/link';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { getPublishedPosts } from '@/lib/blogDb';
import { PRE_BUILT_SCREENS } from '@/lib/mock-data';
import { formatDate } from '@/lib/blog';

const FAQ = [
  {
    q: 'What is Scripwise?',
    a: 'Scripwise is a free Indian stock research and screening platform covering NSE and BSE listed companies. It offers financial ratios, profit and loss, balance sheet and cash-flow data, shareholding patterns and a transparent Scripwise Score.',
  },
  {
    q: 'Is the Scripwise stock screener free?',
    a: 'Yes. The Explorer screener works without logging in and lets you filter 5,000+ NSE and BSE companies by valuation, growth, profitability and Scripwise Score. Some deeper features are available with an account or the Pro plan.',
  },
  {
    q: 'What is the Scripwise Score?',
    a: 'It is a rule-based 0 to 100 read on a company\'s fundamentals, built from valuation, profitability, growth, balance-sheet strength and shareholding. It is deterministic and does not use external AI, so the same inputs always give the same score.',
  },
  {
    q: 'How fresh is the data?',
    a: 'Scripwise uses NSE and BSE end-of-day data, updated after each trading day\'s close. It is not a real-time trading feed.',
  },
  {
    q: 'Is Scripwise investment advice?',
    a: 'No. Scripwise is not a SEBI-registered investment adviser. Everything on the site is for information and education only; please consult a SEBI-registered adviser before investing.',
  },
];

interface TopStock { symbol: string; name: string; sector: string | null }

async function getTopStocks(): Promise<TopStock[]> {
  try {
    const { data } = await supabase
      .from('screener_view')
      .select('symbol, name, sector, market_cap')
      .not('market_cap', 'is', null)
      .order('market_cap', { ascending: false })
      .limit(12);
    return (data ?? []) as TopStock[];
  } catch {
    return [];
  }
}

export default async function HomeSeoSections() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const [stocks, posts] = await Promise.all([getTopStocks(), getPublishedPosts()]);
  const faqLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }).replace(/</g, '\\u003c');

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 md:px-6">
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: faqLd }} />

      <section aria-labelledby="home-tools">
        <h2 id="home-tools" className="h-section mb-2 text-[#0D1117]">Everything you need to research Indian stocks</h2>
        <p className="mb-6 max-w-3xl text-[#4A5568]">
          Scripwise brings screening, company fundamentals and market data for NSE and BSE listed companies into one place,
          so you can go from an idea to a shortlist without juggling spreadsheets.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/screener" className="card-plain block p-5 hover:border-[#F97316]">
            <h3 className="mb-1 font-semibold text-[#0D1117]">Stock Explorer</h3>
            <p className="text-sm text-[#4A5568]">Filter 5,000+ companies by P/E, ROE, debt, growth and more. No login needed.</p>
          </Link>
          <Link href="/screens" className="card-plain block p-5 hover:border-[#F97316]">
            <h3 className="mb-1 font-semibold text-[#0D1117]">Pre-built screens</h3>
            <p className="text-sm text-[#4A5568]">Ready-made quality, value and income screens, such as {PRE_BUILT_SCREENS[0]?.title ?? 'High Quality Compounders'}.</p>
          </Link>
          <Link href="/pulse" className="card-plain block p-5 hover:border-[#F97316]">
            <h3 className="mb-1 font-semibold text-[#0D1117]">Scripwise Pulse</h3>
            <p className="text-sm text-[#4A5568]">A market fear and greed gauge to see how stretched sentiment is.</p>
          </Link>
        </div>
      </section>

      {stocks.length > 0 && (
        <section aria-labelledby="home-stocks">
          <h2 id="home-stocks" className="h-section mb-4 text-[#0D1117]">Largest listed companies by market cap</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stocks.map(s => (
              <li key={s.symbol}>
                <Link href={`/stocks/${encodeURIComponent(s.symbol)}`} className="card-plain flex items-center justify-between gap-3 px-4 py-3 hover:border-[#F97316]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[#0D1117]">{s.name}</span>
                    <span className="block text-xs text-[#8A96A8]">{s.symbol}{s.sector ? ` · ${s.sector}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[#EA580C]">View</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {posts.length > 0 && (
        <section aria-labelledby="home-blog">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="home-blog" className="h-section text-[#0D1117]">From the blog</h2>
            <Link href="/blog" className="text-sm font-semibold text-[#EA580C] hover:underline">All articles</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {posts.slice(0, 3).map(p => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="card-plain block p-5 hover:border-[#F97316]">
                <div className="mb-1 text-xs text-[#8A96A8]">{p.publishedAt ? formatDate(p.publishedAt) : ''}</div>
                <h3 className="mb-1 font-semibold leading-snug text-[#0D1117]">{p.title}</h3>
                <p className="line-clamp-3 text-sm text-[#4A5568]">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="home-faq">
        <h2 id="home-faq" className="h-section mb-4 text-[#0D1117]">Frequently asked questions</h2>
        <div className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB] bg-white">
          {FAQ.map(f => (
            <div key={f.q} className="p-5">
              <h3 className="mb-1 font-semibold text-[#0D1117]">{f.q}</h3>
              <p className="leading-relaxed text-[#4A5568]">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
