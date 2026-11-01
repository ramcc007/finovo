import Link from 'next/link';
import { headers } from 'next/headers';
import { categoryHref } from './categories';
import { notFound } from 'next/navigation';
import { Rss } from 'lucide-react';
import { getPublishedPosts } from '@/lib/blogDb';
import BlogAdminBar from './BlogAdminBar';
import { FeaturedPostCard, PostCard } from './PostCard';
import Pagination from './Pagination';
import { ld } from './jsonLd';

export const POSTS_PER_PAGE = 9;

/** Shared by /blog (page 1) and /blog/page/[n]. */
export default async function BlogListing({ page }: { page: number }) {
  const all = await getPublishedPosts();
  const totalPages = Math.max(1, Math.ceil(all.length / POSTS_PER_PAGE));
  if (page > totalPages) notFound();
  const posts = all.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  // Page 1 leads with a large featured card; later pages are a plain grid.
  const featured = page === 1 ? posts[0] : undefined;
  const grid = page === 1 ? posts.slice(1) : posts;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.map((p, i) => ({
      '@type': 'ListItem',
      position: (page - 1) * POSTS_PER_PAGE + i + 1,
      url: `https://www.scripwise.co.in/blog/${p.slug}`,
      name: p.title,
    })),
  };
  const categories = [...new Set(all.map(p => p.category))].sort();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Scripwise Blog',
    url: 'https://www.scripwise.co.in/blog',
    publisher: { '@type': 'Organization', name: 'Scripwise', url: 'https://www.scripwise.co.in' },
    blogPost: posts.map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `https://www.scripwise.co.in/blog/${p.slug}`,
      datePublished: p.publishedAt,
      author: { '@type': 'Person', name: p.author },
    })),
  };

  return (
    <div>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(jsonLd) }} />
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(itemList) }} />

      <header className="hero-dark relative overflow-hidden">
        <div className="hero-grid" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#FB923C]">The Scripwise Blog</p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl">
            {page === 1 ? 'Indian stock market insights, in plain language' : `Latest articles, page ${page}`}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/60 md:text-lg">
            FPI flows, SIPs, index funds, valuation and how to screen NSE &amp; BSE stocks, without the jargon.
          </p>
          <a href="/blog/feed.xml" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white">
            <Rss size={14} /> RSS feed
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <BlogAdminBar />
        {categories.length > 1 && (
          <nav aria-label="Blog categories" className="mb-8 flex flex-wrap gap-2">
            {categories.map(c => (
              <Link key={c} href={categoryHref(c)} className="rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#0D1117] hover:border-[#F97316] hover:text-[#EA580C]">{c}</Link>
            ))}
          </nav>
        )}
        {posts.length === 0 && <p className="text-[#4A5568]">No posts yet. Check back soon.</p>}
        {featured && <div className="mb-8"><FeaturedPostCard post={featured} /></div>}
        {grid.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map(p => <PostCard key={p.id} post={p} />)}
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} />
      </div>
    </div>
  );
}
