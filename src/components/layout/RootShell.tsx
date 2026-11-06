import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/app/globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { electionLinkActive } from '@/lib/election/nav';
import PreviewBanner from '@/components/layout/PreviewBanner';
import GoogleAnalytics from '@/components/layout/GoogleAnalytics';
import { AuthProvider } from '@/lib/AuthProvider';
import { SITE_JSON_LD } from '@/lib/siteMeta';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

/**
 * The html/body shell shared by the two root layouts: (app) reads request headers (nonce, path) so its pages render
 * per request, while (static) does not, so its pages can be cached.
 */
export default function RootShell({ children, nonce, pathname }: { children: React.ReactNode; nonce?: string; pathname: string }) {
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
