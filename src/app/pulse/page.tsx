import type { Metadata } from 'next';
import PulsePageClient from './PulsePageClient';

export const metadata: Metadata = {
  title: 'Scripwise Pulse — Market Fear & Greed Gauge',
  description: 'A daily fear/greed read on Indian equities based on breadth, volatility, and momentum signals across NSE & BSE.',
};

export default function Page() {
  return <PulsePageClient />;
}
