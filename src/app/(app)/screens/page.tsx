import type { Metadata } from 'next';
import ScreensPageClient from './ScreensPageClient';

export const metadata: Metadata = {
  title: 'Pre-built Stock Screens for Indian Equities',
  description: 'Explore ready-made stock screens such as Undervalued Gems, High ROE Compounders and Debt-Free Cash Machines, built on Scripwise fundamental data.',
};

export default function Page() {
  return <ScreensPageClient />;
}
