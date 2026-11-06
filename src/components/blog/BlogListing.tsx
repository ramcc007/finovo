import Link from 'next/link';
import { categoryHref } from './categories';
import { notFound } from 'next/navigation';
import { BookOpen, Rss } from 'lucide-react';
import ContentSearch from '@/components/search/ContentSearch';
import { searchDocs } from '@/lib/contentSearch';
import { getPublishedPosts } from '@/lib/blogDb';
import BlogAdminBar from './BlogAdminBar';
import { FeaturedPostCard, PostCard } from './PostCard';
import Pagination from './Pagination';
import { ld } from './jsonLd';

export const POSTS_PER_PAGE = 9;

/** Shared by /blog (page 1) and /blog/page/[n]. */
export default async function BlogListing({ page, q = '' }: { page: number; q?: string }) {
  const all = await getPublishedPosts();
  const totalPages = Math.max(1, Math.ceil(all.length / POSTS_PER_PAGE));
  if (page > totalPages) notFound();
  const query = page === 1 ? q.trim().slice(0, 60) : '';
  const hits = query ? new Set(searchDocs(all.map(p => ({ href: p.slug, title: p.title, sub: p.excerpt, tag: p.category, extra: p.tags.join(' ') })), query, 100).map(d => d.href)) : null;
  const found = hits ? all.filter(p => hits.has(p.slug)) : null;
  const posts = found ?? all.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
  const nonce: string | undefined = undefined; // JSON-LD blocks are data, not executed script, so they need no CSP nonce

  // Page 1 leads with a large featured card; later pages are a plain grid.
  const featured = page === 1 && !found ? posts[0] : undefined;
  const grid = page === 1 && !found ? posts.slice(1) : posts;

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
  const counts = new Map<string, number>();
  for (const p of all) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);

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
      author: { '@type': 'Organization', name: p.author },
    })),
  };

  return (
    <div>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(jsonLd) }} />
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(itemList) }} />

      <header className="hero-dark hero-open relative">
        <div className="hero-grid" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#FB923C]">The Scripwise Blog</p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl">
            {page === 1 ? 'Indian stock market insights, in plain language' : `Latest articles, page ${page}`}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/60 md:text-lg">
            FPI flows, SIPs, index funds, valuation and how to screen NSE &amp; BSE stocks, without the jargon.
          </p>
          {page === 1 && <div className="mt-7 max-w-2xl"><ContentSearch id="blog-search" type="blog" placeholder="Search articles, e.g. SIP, Nifty, FPI" fullHref="/blog" large /></div>}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/70">
            <span><strong className="text-white">{all.length}</strong> articles · <strong className="text-white">{categories.length}</strong> topics</span>
            <a href="/blog/feed.xml" className="inline-flex min-h-8 items-center gap-1.5 font-semibold hover:text-white"><Rss size={14} /> RSS feed</a>
            <Link href="/glossary" className="inline-flex min-h-8 items-center gap-1.5 font-semibold hover:text-white"><BookOpen size={14} /> Glossary</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <BlogAdminBar />
        {categories.length > 1 && (
          <nav aria-label="Blog categories" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {categories.map(c => (
              <Link key={c} href={categoryHref(c)} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3.5 text-sm font-semibold text-[#0D1117] hover:border-[#F97316] hover:text-[#EA580C]">{c}<span className="text-[#9CA3AF]">{counts.get(c)}</span></Link>
            ))}
          </nav>
        )}
        {found && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2" aria-live="polite">
            <h2 className="text-xl font-bold text-[#0D1117]">{found.length} {found.length === 1 ? 'article' : 'articles'} for “{query}”</h2>
            <Link href="/blog" className="text-sm font-semibold text-[#EA580C] hover:underline">Clear search</Link>
          </div>
        )}
        {posts.length === 0 && (found
          ? <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-8 text-center"><p className="font-semibold text-[#0D1117]">No article matches “{query}”.</p><p className="mt-1 text-sm text-[#4A5568]">Try a shorter word, pick a topic above, or look the term up in the <Link href="/glossary" className="font-semibold text-[#EA580C] hover:underline">glossary</Link>.</p></div>
          : <p className="text-[#4A5568]">No posts yet. Check back soon.</p>)}
        {featured && <div className="mb-8"><FeaturedPostCard post={featured} /></div>}
        {grid.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map(p => <PostCard key={p.id} post={p} />)}
          </div>
        )}
        {!found && <Pagination page={page} totalPages={totalPages} />}
      </div>
    </div>
  );
}
