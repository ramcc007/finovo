import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getPublishedPosts } from '@/lib/blogDb';
import { formatDate } from '@/lib/blog';
import BlogAdminBar from '@/components/blog/BlogAdminBar';
import PostAdminActions from '@/components/blog/PostAdminActions';
import { ld } from '@/components/blog/jsonLd';

export const metadata: Metadata = {
  title: 'Blog: Indian Stock Market Insights & Investing Guides',
  description:
    'Plain-language articles on the Indian stock market: FPI flows, SIPs, index funds, valuation and how to screen NSE & BSE stocks, from the Scripwise team.',
  keywords: ['indian stock market blog', 'nifty analysis', 'sip investing', 'stock screening guide', 'fpi flows india'],
  openGraph: {
    type: 'website',
    title: 'Scripwise Blog: Indian Stock Market Insights & Investing Guides',
    description: 'Plain-language articles on the Indian stock market, FPI flows, SIPs and stock screening.',
    url: 'https://www.scripwise.co.in/blog',
  },
};

export default async function BlogIndex() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const posts = await getPublishedPosts();
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
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(jsonLd) }} />
      <h1 className="text-3xl font-bold text-[#0D1117] mb-2">Scripwise Blog</h1>
      <p className="text-[#4A5568] mb-8">Indian stock market insights and investing guides in plain language.</p>
      <BlogAdminBar />
      {posts.length === 0 && <p className="text-[#4A5568]">No posts yet.</p>}
      <div className="space-y-6">
        {posts.map(p => (
          <article key={p.id} className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
            {p.featuredImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.featuredImage} alt="" className="w-full h-48 object-cover" loading="lazy" />
            )}
            <div className="p-5">
              <div className="text-xs text-[#8A96A8] mb-2">
                <span className="font-semibold text-[#EA580C] uppercase tracking-wide">{p.category}</span>
                {p.publishedAt && <>{' · '}<time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time></>}
                {' · '}{p.readingMinutes} min read
              </div>
              <h2 className="text-xl font-bold text-[#0D1117] mb-2">
                <Link href={`/blog/${p.slug}`} className="hover:text-[#EA580C]">{p.title}</Link>
              </h2>
              <p className="text-[#4A5568] text-sm leading-relaxed mb-3">{p.excerpt}</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {p.tags.slice(0, 4).map(t => (
                    <span key={t} className="text-xs bg-[#FFF7ED] text-[#C2410C] rounded-full px-2.5 py-0.5">{t}</span>
                  ))}
                </div>
                <PostAdminActions id={p.id} title={p.title} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
