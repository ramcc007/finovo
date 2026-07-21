import type { Metadata } from 'next';
import CalendarPageClient from './CalendarPageClient';

export const metadata: Metadata = {
  title: 'Corporate Actions Calendar — Dividends, Splits & Bonus Issues',
  description: 'Track upcoming dividends, stock splits, bonus issues, and other corporate actions for NSE & BSE listed companies.',
};

export default function Page() {
  return <CalendarPageClient />;
}
