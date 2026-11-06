import type { Metadata } from 'next';
import PulsePageClient from './PulsePageClient';
import ToolIntro from '@/components/seo/ToolIntro';
import { pageMeta } from '@/lib/siteMeta';

export const metadata: Metadata = pageMeta({
  title: 'Pulse: Indian Market Fear & Greed Gauge',
  description: 'A daily fear and greed reading for Indian equities, built from market breadth, stocks near 52-week highs and lows, and the day\u2019s index move.',
  path: '/pulse',
});

export default function Page() {
  return (
    <>
      <PulsePageClient />
      <ToolIntro
        heading="How the Scripwise Pulse is built"
        intro={[
          'Pulse is a single reading of market mood, from extreme fear to extreme greed, worked out from Scripwise\u2019s own price data for NSE and BSE stocks. It is not a third-party index.',
          'The reading combines how many stocks rose against fell, how many trade in the upper half of their 52-week range, how many sit near a 52-week high or low, and how the Nifty 50 moved on the day.',
        ]}
        points={[
          'Fear means most stocks are falling and many are near their lows.',
          'Greed means most stocks are rising and many are near their highs.',
          'Pulse is shown only when enough stocks have fresh prices for the reading to be fair.',
        ]}
        faq={[
          { q: 'Is Pulse a signal to buy or sell?', a: 'No. It describes the mood of the market today. Many investors find it more useful as context than as a trigger, and it is not advice.' },
          { q: 'How often does it change?', a: 'It updates as new prices arrive, and it is built only from stocks that have a fresh price.' },
        ]}
        links={[
          { href: '/markets', label: 'Market overview' },
          { href: '/screener', label: 'Stock Explorer' },
          { href: '/blog/fii-vs-dii-who-is-moving-the-market', label: 'FII vs DII: who is moving the market' },
        ]}
      />
    </>
  );
}
