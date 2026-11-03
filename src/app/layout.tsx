import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { electionLinkActive } from '@/lib/election/nav';
import PreviewBanner from '@/components/layout/PreviewBanner';
import GoogleAnalytics from '@/components/layout/GoogleAnalytics';
import { AuthProvider } from '@/lib/AuthProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const BASE_URL = 'https://www.scripwise.co.in';

// Self-referencing canonical, stripped of query string, applied site-wide —
// a URL carrying tracking params (?ref=..., utm_*, etc.) always canonicalizes
// to the clean path so Google consolidates onto that instead of indexing the
// tracked variant as its own page.
export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get('x-pathname') ?? '/';
  return { ...metadata, alternates: { canonical: pathname } };
}

const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Scripwise | Free Indian Stocks Screener & Research Tool',
    template: '%s | Scripwise',
  },
  description: 'Screen, analyse and research 5000+ NSE & BSE listed Indian stocks for free. Financial ratios, P&L statements, shareholding patterns, and custom screener.',
  keywords: ['indian stock screener', 'nse bse stocks', 'stock research india', 'fundamental analysis', 'stock screener free', 'scripwise'],
  authors: [{ name: 'RCC' }],
  creator: 'RCC',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: BASE_URL,
    siteName: 'Scripwise',
    title: 'Scripwise | Free Indian Stocks Screener & Research Tool',
    description: 'Screen, analyse and research 5000+ NSE & BSE listed stocks. Free fundamental data, financial ratios, and custom screener.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scripwise | Free Indian Stocks Screener & Research Tool',
    description: 'Screen and research 5000+ Indian stocks for free.',
  },
};

const SITE_JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Scripwise',
    url: BASE_URL,
    logo: `${BASE_URL}/icon`,
    description: 'Free Indian stock research and screening platform for NSE & BSE listed companies.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    name: 'Scripwise',
    url: BASE_URL,
    inLanguage: 'en-IN',
    publisher: { '@id': `${BASE_URL}/#organization` },
  },
]).replace(/</g, '\\u003c');

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const nonce = h.get('x-nonce') ?? undefined;
  const pathname = h.get('x-pathname') ?? '/';
  const showElection = electionLinkActive();
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: SITE_JSON_LD }} />
        <AuthProvider>
          <GoogleAnalytics nonce={nonce} pathname={pathname} />
          <Header showElection={showElection} />
          <main className="min-h-screen">{children}</main>
          <Footer showElection={showElection} />
          {/* Fixed to the bottom of the viewport (out of flow), so it can
              appear after hydration without shifting the page. */}
          <PreviewBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
