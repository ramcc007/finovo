import type { Metadata } from 'next';
import ScreenerPageClient from './ScreenerPageClient';
import ToolIntro from '@/components/seo/ToolIntro';
import { pageMeta } from '@/lib/siteMeta';

export const metadata: Metadata = pageMeta({
  title: 'Stock Screener for NSE & BSE Stocks',
  description: 'Filter 5000+ NSE and BSE stocks by P/E, ROE, debt-to-equity, growth and more. Free filters across profitability, valuation and financial health.',
  path: '/screener',
});

export default function Page() {
  return (
    <>
      <ScreenerPageClient />
      <ToolIntro
        heading="Using the Stock Explorer"
        intro={[
          'The Stock Explorer filters more than 5,000 NSE and BSE listed companies by valuation, profitability, growth, debt, dividends and promoter holding. Combine filters to narrow the list, sort by any column, and open a company page for its financials, ratios and Scripwise Score.',
          'The Free plan includes the core filters: sector, market cap, P/E, ROE, debt to equity and the Scripwise Score. Pro unlocks all 47 filters, unlimited saved screens and CSV export.',
        ]}
        faq={[
          { q: 'What is a stock screener?', a: 'A tool that filters a large list of stocks by numbers you choose, such as return on equity above 15 percent and low debt, so you can shortlist companies to research.' },
          { q: 'Where does the data come from?', a: 'Prices come from NSE end-of-day files and, for the largest companies, a live feed during market hours. Financial statements and ratios come from public sources including NSE, BSE and financial data providers.' },
          { q: 'Does passing a screen make a stock a good investment?', a: 'No. A screen only shows which companies meet your numbers today. It cannot tell you about the business, the price you pay or the risks.' },
        ]}
        links={[
          { href: '/screens', label: 'Pre-built screens' },
          { href: '/markets', label: 'Market overview' },
          { href: '/glossary', label: 'Investing glossary' },
          { href: '/pricing', label: 'Free and Pro plans' },
        ]}
      />
    </>
  );
}
