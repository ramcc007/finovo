import type { Metadata } from 'next';
import ScreenerPageClient from './ScreenerPageClient';

export const metadata: Metadata = {
  title: 'Stock Screener for NSE & BSE Stocks',
  description: 'Filter 5000+ NSE and BSE stocks by P/E, ROE, debt-to-equity, growth and more. Free filters across profitability, valuation and financial health.',
};

export default function Page() {
  return <ScreenerPageClient />;
}
