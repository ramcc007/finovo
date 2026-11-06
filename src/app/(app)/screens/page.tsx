import type { Metadata } from 'next';
import ScreensPageClient from './ScreensPageClient';
import ToolIntro from '@/components/seo/ToolIntro';
import { pageMeta } from '@/lib/siteMeta';

export const metadata: Metadata = pageMeta({
  title: 'Pre-built Stock Screens for Indian Equities',
  description: 'Explore ready-made stock screens such as Undervalued Gems, High ROE Compounders and Debt-Free Cash Machines, built on Scripwise fundamental data.',
  path: '/screens',
});

export default function Page() {
  return (
    <>
      <ScreensPageClient />
      <ToolIntro
        heading="What the pre-built screens do"
        intro={[
          'A screen is a saved set of filters applied to Indian stocks. The pre-built screens cover common starting points: quality compounders, value, dividend payers, momentum, companies with no debt, and turnaround situations.',
          'Each screen runs on Scripwise fundamental data, so the list changes as new quarterly and annual numbers arrive. A screen is a way to shortlist stocks to read about, not a recommendation.',
        ]}
        faq={[
          { q: 'How are the screens built?', a: 'Each one combines filters on return on equity, debt, growth, valuation and similar measures. The criteria are shown on the screen so you can see why a stock is on the list.' },
          { q: 'Can I make my own screen?', a: 'Yes. The Stock Explorer has the filters, and you can save your own combinations once you have an account.' },
          { q: 'Are the results investment advice?', a: 'No. They show which stocks meet a set of numbers today. Read the company and its filings before you decide anything.' },
        ]}
        links={[
          { href: '/screener', label: 'Build your own screen' },
          { href: '/markets', label: 'Market overview' },
          { href: '/glossary/roe-return-on-equity', label: 'What is ROE?' },
        ]}
      />
    </>
  );
}
