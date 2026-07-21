import type { Metadata } from 'next';
import ScreensPageClient from './ScreensPageClient';

export const metadata: Metadata = {
  title: 'Pre-built Stock Screens — Ready-made Filters for Indian Equities',
  description: 'Explore ready-made stock screens — Undervalued Gems, High ROE Compounders, Debt-Free Cash Machines and more — built on Scripwise’s fundamental data.',
};

export default function Page() {
  return <ScreensPageClient />;
}
