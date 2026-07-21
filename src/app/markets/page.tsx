import type { Metadata } from 'next';
import MarketsPageClient from './MarketsPageClient';

export const metadata: Metadata = {
  title: 'Markets Overview — NIFTY, Sensex, Gainers, Losers & Sector Performance',
  description: 'Track NIFTY 50, Sensex, sector indices, and the day’s top gainers and losers across NSE & BSE, updated after each trading day’s close.',
};

export default function Page() {
  return <MarketsPageClient />;
}
