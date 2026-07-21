import type { Metadata } from 'next';
import ScreenerPageClient from './ScreenerPageClient';

export const metadata: Metadata = {
  title: 'Stock Screener — Filter 5000+ NSE & BSE Stocks by Fundamentals',
  description: 'Screen Indian stocks by P/E, ROE, debt-to-equity, growth and more. Filters across profitability, valuation, and financial health, free for NSE & BSE equities.',
};

export default function Page() {
  return <ScreenerPageClient />;
}
