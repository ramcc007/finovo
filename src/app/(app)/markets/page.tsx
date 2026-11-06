import type { Metadata } from 'next';
import MarketsPageClient from './MarketsPageClient';
import ToolIntro from '@/components/seo/ToolIntro';
import { pageMeta } from '@/lib/siteMeta';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = pageMeta({
  title: 'Markets Today: Nifty, Sensex, Gainers & Losers',
  description: 'Track the Nifty 50, Sensex, sector indices and the day’s top gainers and losers across NSE and BSE, updated after each trading day’s close.',
  path: '/markets',
});

type IndexRow = { name: string; last: number | null; change_pct: number | null };

async function latestIndices(): Promise<IndexRow[]> {
  try {
    const { data } = await supabase.from('indices').select('name, last, change_pct').order('rank', { ascending: true }).limit(12);
    return (data ?? []) as IndexRow[];
  } catch { return []; }
}

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function Page() {
  const indices = (await latestIndices()).filter(i => i.last != null);
  return (
    <>
      <MarketsPageClient />
      <ToolIntro
        heading="How to read the market overview"
        intro={[
          'The market overview shows how Indian stocks moved at the latest NSE close: the Nifty 50, Sensex, Nifty Midcap 100 and Smallcap 100, the day\u2019s top gainers and losers, the most active stocks by volume, stocks near their 52-week highs and lows, and how each sector performed.',
          'The largest companies are refreshed through the trading session. Every other stock keeps its last close, and the page says which date the numbers are from.',
        ]}
        points={[
          'Advances, declines and unchanged stocks show how broad the day\u2019s move was.',
          'Sector performance is the average move of the stocks in each sector.',
          'The Sensex 30, Nifty 50, Midcap 100 and Smallcap 100 tabs list every member stock, largest first.',
        ]}
        faq={[
          { q: 'What do the top gainers and losers lists show?', a: 'The stocks with the largest percentage rise and fall at the latest close. Moves above 40 percent in a day are left out, because they are usually a split or other corporate action and not a real price change.' },
          { q: 'How fresh is the data?', a: 'End-of-day prices are loaded after the NSE close. The largest 500 companies and the index levels are refreshed during market hours. The page shows when it was last updated.' },
          { q: 'Is this investment advice?', a: 'No. The lists describe what happened. They are not a reason to buy or sell any stock.' },
        ]}
        links={[
          { href: '/screener', label: 'Stock Explorer' },
          { href: '/pulse', label: 'Market fear and greed' },
          { href: '/screens', label: 'Pre-built screens' },
          { href: '/glossary/nifty-50', label: 'What is the Nifty 50?' },
        ]}
      >
        {indices.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-[#8A96A8]">Latest index levels</caption>
              <thead><tr className="border-b border-[#E5E7EB] text-left text-xs text-[#8A96A8]"><th className="py-1.5 pr-4 font-medium">Index</th><th className="py-1.5 pr-4 text-right font-medium">Level</th><th className="py-1.5 text-right font-medium">Change</th></tr></thead>
              <tbody>
                {indices.map(i => (
                  <tr key={i.name} className="border-b border-[#EEF1F7]">
                    <td className="py-1.5 pr-4 text-[#0D1117]">{i.name}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(Number(i.last))}</td>
                    <td className="py-1.5 text-right tabular-nums">{i.change_pct == null ? 'n/a' : `${Number(i.change_pct) >= 0 ? '+' : ''}${Number(i.change_pct).toFixed(2)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ToolIntro>
    </>
  );
}
