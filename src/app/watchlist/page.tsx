import type { Metadata } from 'next';
import WatchlistPageClient from './WatchlistPageClient';

export const metadata: Metadata = {
  title: 'My Watchlist',
  description: 'Track your saved stocks with live scores and fundamentals in one place.',
  robots: { index: false, follow: true },
};

export default function Page() {
  return <WatchlistPageClient />;
}
