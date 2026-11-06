import type { Metadata } from 'next';
import ComparePageClient from './ComparePageClient';

export const metadata: Metadata = {
  title: 'Compare Indian Stocks Side by Side',
  description: 'Compare up to 4 Indian stocks side by side on valuation, profitability, growth and financial health, using the same fundamentals as the screener.',
};

export default function Page() {
  return <ComparePageClient />;
}
