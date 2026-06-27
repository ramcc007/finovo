import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'Finovo — Indian Stock Screener & Research',
  description: 'Screen, analyse and research 5000+ Indian stocks. Free fundamental data, financial ratios, and custom screener for NSE & BSE.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
