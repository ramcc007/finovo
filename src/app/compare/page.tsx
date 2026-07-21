import type { Metadata } from 'next';
import ComparePageClient from './ComparePageClient';

export const metadata: Metadata = {
  title: 'Compare Stocks — Side-by-Side Fundamental Analysis',
  description: 'Compare up to 4 Indian stocks side by side on valuation, profitability, growth, and financial health metrics.',
};

export default function Page() {
  return <ComparePageClient />;
}
