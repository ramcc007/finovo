import type { Metadata } from 'next';
import { pageMeta } from '@/lib/siteMeta';
import BlogListing from '@/components/blog/BlogListing';
import { getPublishedPosts } from '@/lib/blogDb';
import { POSTS_PER_PAGE } from '@/components/blog/BlogListing';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  if ((await searchParams).q) return { title: 'Search the Scripwise blog', robots: { index: false, follow: true }, alternates: { canonical: '/blog' } };
  const total = Math.max(1, Math.ceil((await getPublishedPosts()).length / POSTS_PER_PAGE));
  const base = pageMeta({
    title: 'Indian Stock Market Blog and Investing Guides',
    description:
      'Plain-language articles on the Indian stock market: FPI flows, SIPs, index funds, valuation and how to screen NSE & BSE stocks, from the Scripwise team.',
    path: '/blog',
  });
  return {
    ...base,
    alternates: { canonical: '/blog', types: { 'application/rss+xml': '/blog/feed.xml', 'application/feed+json': '/blog/feed.json' } },
    ...(total > 1 ? { pagination: { next: '/blog/page/2' } } : {}),
  };
}

export default async function BlogIndex({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <BlogListing page={1} q={(await searchParams).q ?? ''} />;
}
