import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
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

export const metadata: Metadata = {
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <GoogleAnalytics nonce={nonce} />
        <AuthProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
