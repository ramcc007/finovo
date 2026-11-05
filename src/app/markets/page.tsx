import type { Metadata } from 'next';
import MarketsPageClient from './MarketsPageClient';

export const metadata: Metadata = {
  title: 'Markets Today: Nifty, Sensex, Gainers & Losers',
  description: 'Track the Nifty 50, Sensex, sector indices and the day’s top gainers and losers across NSE and BSE, updated after each trading day’s close.',
};

export default function Page() {
  return <MarketsPageClient />;
}
