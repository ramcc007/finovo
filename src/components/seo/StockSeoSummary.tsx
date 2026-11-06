import Link from 'next/link';
import { formatCrores } from '@/lib/utils';

export interface StockSeoData {
  symbol: string; name: string; sector: string | null; industry: string | null;
  price: number | null; marketCap: number | null; pe: number | null; pb: number | null; roe: number | null;
  debtToEquity: number | null; dividendYield: number | null; week52High: number | null; week52Low: number | null;
  promoterPct: number | null;
  summary: string | null; city: string | null; state: string | null; employees: number | null;
}

const n = (v: number | null, d = 1, suf = '') => (v == null || !isFinite(v) ? null : `${v.toFixed(d)}${suf}`);
const rupee = (v: number | null) => (v == null || !isFinite(v) ? null : `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);

/** Short sentence-boundary excerpt of the company summary. */
function excerpt(s: string, max = 520): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.'));
  return end > 200 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}

/**
 * Plain text for a stock page, rendered on the server: the page itself loads its numbers in the browser, so without
 * this a crawler that does not run scripts sees nothing about the company. Only facts that are on file are written.
 */
export default function StockSeoSummary({ d }: { d: StockSeoData }) {
  const facts: [string, string | null][] = [
    ['Market cap', d.marketCap != null ? `₹${formatCrores(d.marketCap)}` : null],
    ['P/E ratio', n(d.pe, 1, 'x')],
    ['P/B ratio', n(d.pb, 2, 'x')],
    ['Return on equity', n(d.roe, 1, '%')],
    ['Debt to equity', n(d.debtToEquity, 2, 'x')],
    ['Dividend yield', n(d.dividendYield, 2, '%')],
    ['52-week range', d.week52Low != null && d.week52High != null ? `${rupee(d.week52Low)} to ${rupee(d.week52High)}` : null],
    ['Promoter holding', n(d.promoterPct, 1, '%')],
  ];
  const shown = facts.filter(([, v]) => v != null) as [string, string][];
  const where = [d.city, d.state].filter(Boolean).join(', ');
  return (
    <section aria-label={`About ${d.name}`} className="border-t border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <h2 className="text-xl font-bold text-[#0D1117]">About {d.name} ({d.symbol})</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#4A5568]">
          {d.name} is listed on the NSE under the symbol {d.symbol}
          {d.sector ? ` and is classified in the ${d.sector} sector${d.industry && d.industry !== d.sector ? `, ${d.industry}` : ''}` : ''}.
          {d.price != null ? ` The latest price on Scripwise is ${rupee(d.price)}.` : ''}
          {where ? ` The company is based in ${where}.` : ''}
          {d.employees ? ` It reports about ${d.employees.toLocaleString('en-IN')} employees.` : ''}
        </p>
        {d.summary && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#4A5568]">{excerpt(d.summary)}</p>}
        {shown.length > 0 && (
          <dl className="mt-6 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {shown.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-[#8A96A8]">{k}</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#0D1117]">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
          {d.sector && <Link href={`/screener?sector=${encodeURIComponent(d.sector)}`} className="text-[#EA580C] hover:underline">More {d.sector} stocks</Link>}
          <Link href="/glossary/roe-return-on-equity" className="text-[#EA580C] hover:underline">What is ROE?</Link>
          <Link href="/screens" className="text-[#EA580C] hover:underline">Pre-built screens</Link>
          <Link href="/compare" className="text-[#EA580C] hover:underline">Compare stocks</Link>
        </p>
        <p className="mt-6 max-w-3xl text-xs text-[#8A96A8]">
          Figures come from public sources and may lag or contain errors. This page describes a company and is not investment advice.
        </p>
      </div>
    </section>
  );
}
