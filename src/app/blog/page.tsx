import type { Metadata } from 'next';
import BlogListing from '@/components/blog/BlogListing';
import { getPublishedPosts } from '@/lib/blogDb';
import { POSTS_PER_PAGE } from '@/components/blog/BlogListing';

export async function generateMetadata(): Promise<Metadata> {
  const total = Math.max(1, Math.ceil((await getPublishedPosts()).length / POSTS_PER_PAGE));
  return {
    title: 'Blog: Indian Stock Market Insights & Investing Guides',
    description:
      'Plain-language articles on the Indian stock market: FPI flows, SIPs, index funds, valuation and how to screen NSE & BSE stocks, from the Scripwise team.',
    alternates: { canonical: '/blog', types: { 'application/rss+xml': '/blog/feed.xml', 'application/feed+json': '/blog/feed.json' } },
    ...(total > 1 ? { pagination: { next: '/blog/page/2' } } : {}),
    keywords: ['indian stock market blog', 'nifty analysis', 'sip investing', 'stock screening guide', 'fpi flows india'],
    openGraph: {
      type: 'website',
      title: 'Scripwise Blog: Indian Stock Market Insights & Investing Guides',
      description: 'Plain-language articles on the Indian stock market, FPI flows, SIPs and stock screening.',
      url: 'https://www.scripwise.co.in/blog',
    },
  };
}

export default function BlogIndex() {
  return <BlogListing page={1} />;
}
