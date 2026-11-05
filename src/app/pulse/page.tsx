import type { Metadata } from 'next';
import PulsePageClient from './PulsePageClient';

export const metadata: Metadata = {
  title: 'Pulse: Indian Market Fear & Greed Gauge',
  description: 'A daily fear and greed read on Indian equities, built from breadth, volatility and momentum signals across NSE and BSE.',
};

export default function Page() {
  return <PulsePageClient />;
}
