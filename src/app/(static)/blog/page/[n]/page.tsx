import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import BlogListing, { POSTS_PER_PAGE } from '@/components/blog/BlogListing';
import { getPublishedPosts } from '@/lib/blogDb';

type Props = { params: Promise<{ n: string }> };

function parse(n: string): number | null {
  return /^\d{1,4}$/.test(n) && Number(n) >= 1 ? Number(n) : null;
}

// Cached and refreshed every 5 minutes (admin saves also invalidate the data cache). An empty list means pages are
// built on first request, then served from cache, instead of being rendered for every visitor.
export const revalidate = 300;
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = parse((await params).n);
  if (!page) return { title: 'Page not found', robots: { index: false } };
  const total = Math.max(1, Math.ceil((await getPublishedPosts()).length / POSTS_PER_PAGE));
  const href = (p: number) => (p <= 1 ? '/blog' : `/blog/page/${p}`);
  return {
    title: `Blog: Indian Stock Market Insights, Page ${page}`,
    description: `Scripwise blog articles on the Indian stock market, page ${page} of ${total}.`,
    alternates: { canonical: href(page) },
    pagination: { previous: page > 1 ? href(page - 1) : undefined, next: page < total ? href(page + 1) : undefined },
  };
}

export default async function BlogPage({ params }: Props) {
  const page = parse((await params).n);
  if (!page) notFound();
  if (page === 1) redirect('/blog');
  return <BlogListing page={page} />;
}
