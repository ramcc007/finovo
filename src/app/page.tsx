import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import HomeSeoSections from './HomeSeoSections';

export const metadata: Metadata = {
  title: { absolute: 'Scripwise | Free Indian Stocks Screener & Research Tool for NSE & BSE' },
  description:
    'Screen, analyse and research 5,000+ NSE & BSE listed Indian stocks for free. Financial ratios, shareholding, the Scripwise Score and ready-made stock screens.',
  alternates: { canonical: '/' },
};

// The interactive hero/market widgets are a client component; the sections
// below are rendered on the server so crawlers (including AI crawlers that
// don't run JavaScript) get real, linkable content, not just the shell.
export default function Page() {
  return (
    <>
      <HomeClient />
      <HomeSeoSections />
    </>
  );
}
