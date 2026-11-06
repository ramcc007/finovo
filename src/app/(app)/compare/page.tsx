import type { Metadata } from 'next';
import ComparePageClient from './ComparePageClient';
import ToolIntro from '@/components/seo/ToolIntro';
import { pageMeta } from '@/lib/siteMeta';

export const metadata: Metadata = pageMeta({
  title: 'Compare Indian Stocks Side by Side',
  description: 'Compare up to 4 Indian stocks side by side on valuation, profitability, growth and financial health, using the same fundamentals as the screener.',
  path: '/compare',
});

export default function Page() {
  return (
    <>
      <ComparePageClient />
      <ToolIntro
        heading="Compare up to four stocks"
        intro={[
          'Pick up to four NSE or BSE companies and see them in one table: price, valuation ratios such as P/E and P/B, profitability such as ROE and margins, growth, and debt. Every number comes from the same data as the Stock Explorer, so the comparison is like for like.',
          'Compare is part of Scripwise Pro. The Free plan includes the Stock Explorer, company pages and the market overview.',
        ]}
        faq={[
          { q: 'Which stocks can I compare?', a: 'Any stock listed on the NSE or BSE that Scripwise tracks. Comparing companies in the same sector usually says the most, because their numbers are alike.' },
          { q: 'Does a lower P/E mean a cheaper stock?', a: 'Not always. A low P/E can reflect slower growth or higher risk. Read it with growth, debt and the sector average.' },
        ]}
        links={[
          { href: '/screener', label: 'Stock Explorer' },
          { href: '/pricing', label: 'Scripwise Pro' },
          { href: '/glossary', label: 'Investing glossary' },
        ]}
      />
    </>
  );
}
