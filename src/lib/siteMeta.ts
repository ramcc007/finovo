import type { Metadata } from 'next';

export const BASE_URL = 'https://www.scripwise.co.in';

/** Site-wide defaults. Pages override title, description and the share fields. */
export const baseMetadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Scripwise | Free Indian Stocks Screener & Research Tool',
    template: '%s | Scripwise',
  },
  description: 'Screen, analyse and research 5000+ NSE & BSE listed Indian stocks for free. Financial ratios, P&L statements, shareholding patterns, and custom screener.',
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

export const SITE_JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Scripwise',
    url: BASE_URL,
    logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png`, width: 512, height: 512 },
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

const SHARE_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'Scripwise: Indian stock screener and research' };

/**
 * Metadata for one page: title, description, self-referencing canonical, and share previews (Open Graph and Twitter)
 * that describe THIS page instead of repeating the site default. `title` may be { absolute } to skip the brand suffix.
 */
export function pageMeta(opts: {
  title: string | { absolute: string };
  description: string;
  path: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  image?: string;
}): Metadata {
  const plain = typeof opts.title === 'string' ? opts.title : opts.title.absolute;
  const image = opts.image ? { url: opts.image, width: 1200, height: 630, alt: plain } : SHARE_IMAGE;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: opts.type ?? 'website', locale: 'en_IN', siteName: 'Scripwise', url: opts.path,
      title: plain, description: opts.description, images: [image],
    },
    twitter: { card: 'summary_large_image', title: plain, description: opts.description, images: [image.url] },
  };
}
