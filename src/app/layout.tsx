import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

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

const BASE_URL = 'https://finovo.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Finovo — Free Indian Stock Screener & Research',
    template: '%s | Finovo',
  },
  description: 'Screen, analyse and research 5000+ NSE & BSE listed Indian stocks for free. Financial ratios, P&L statements, shareholding patterns, and custom screener.',
  keywords: ['indian stock screener', 'nse bse stocks', 'stock research india', 'fundamental analysis', 'stock screener free', 'finovo'],
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
    siteName: 'Finovo',
    title: 'Finovo — Free Indian Stock Screener & Research',
    description: 'Screen, analyse and research 5000+ NSE & BSE listed stocks. Free fundamental data, financial ratios, and custom screener.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Finovo Stock Screener' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Finovo — Free Indian Stock Screener',
    description: 'Screen and research 5000+ Indian stocks for free.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
