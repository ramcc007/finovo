import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPublishedPost } from '@/lib/blogDb';
import { formatDate, stripHtml, DEFAULT_DISCLAIMER } from '@/lib/blog';
import Inline from '@/components/blog/Inline';
import PostAdminActions from '@/components/blog/PostAdminActions';
import { ld } from '@/components/blog/jsonLd';

const BASE = 'https://www.scripwise.co.in';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug);
  if (!post) return { title: 'Post not found', robots: { index: false } };
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt;
  return {
    title,
    description,
    keywords: post.tags,
    authors: [{ name: post.author }],
    openGraph: {
      type: 'article',
      url: `${BASE}/blog/${post.slug}`,
      title,
      description,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      section: post.category,
      tags: post.tags,
      ...(post.featuredImage ? { images: [{ url: post.featuredImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image', title, description,
      ...(post.featuredImage ? { images: [post.featuredImage] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const url = `${BASE}/blog/${post.slug}`;

  const jsonLd: unknown[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.metaDescription || post.excerpt,
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: { '@type': 'Person', name: post.author },
      publisher: { '@type': 'Organization', name: 'Scripwise', url: BASE },
      articleSection: post.category,
      keywords: post.tags.join(', '),
      inLanguage: 'en-IN',
      wordCount: stripHtml(post.contentHtml).split(' ').filter(Boolean).length,
      ...(post.featuredImage ? { image: post.featuredImage } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];
  if (post.faq.length > 0) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq.map(f => ({
        '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return (
    <article className="max-w-3xl mx-auto px-4 md:px-6 py-12">
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(d) }} />
      ))}

      <div className="flex items-center justify-between gap-3 mb-4">
        <nav aria-label="Breadcrumb" className="text-xs text-[#8A96A8]">
          <Link href="/" className="hover:text-[#EA580C]">Home</Link> / <Link href="/blog" className="hover:text-[#EA580C]">Blog</Link>
        </nav>
        <PostAdminActions id={post.id} title={post.title} redirectTo="/blog" />
      </div>

      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#EA580C] mb-2">{post.category}</div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#0D1117] leading-tight mb-4">{post.title}</h1>
        <div className="text-sm text-[#4A5568] flex flex-wrap gap-x-3 gap-y-1">
          <span>By <strong className="font-semibold text-[#0D1117]">{post.author}</strong></span>
          {post.publishedAt && (
            <>
              <span>·</span>
              <span>Published <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time></span>
            </>
          )}
          <span>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {post.tags.map(t => (
            <span key={t} className="text-xs bg-[#FFF7ED] text-[#C2410C] rounded-full px-2.5 py-0.5">{t}</span>
          ))}
        </div>
        {post.featuredImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.featuredImage} alt={post.title} className="w-full rounded-xl mt-6 object-cover max-h-[420px]" />
        )}
      </header>

      {post.keyTakeaways.length > 0 && (
        <section aria-labelledby="key-takeaways" className="bg-[#FFF7ED] border border-[#FFEDD5] border-l-4 border-l-[#F97316] rounded-lg p-5 mb-8">
          <h2 id="key-takeaways" className="font-bold text-[#0D1117] mb-3">Key takeaways</h2>
          <ul className="list-disc pl-5 space-y-2 text-[15px] text-[#4A5568] leading-relaxed">
            {post.keyTakeaways.map((k, i) => <li key={i}><Inline text={k} /></li>)}
          </ul>
        </section>
      )}

      <div className="blog-prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

      {post.faq.length > 0 && (
        <section aria-labelledby="faq" className="mt-12">
          <h2 id="faq" className="text-2xl font-bold text-[#0D1117] mb-4">Frequently asked questions</h2>
          <div className="space-y-5">
            {post.faq.map((f, i) => (
              <div key={i}>
                <h3 className="font-semibold text-[#0D1117] mb-1">{f.q}</h3>
                <p className="text-[#4A5568] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 rounded-xl border border-[#E5E7EB] p-5 bg-white">
        <h2 className="font-bold text-[#0D1117] mb-1">Screen stocks yourself</h2>
        <p className="text-sm text-[#4A5568] mb-3">Run quality filters on 5,000+ NSE &amp; BSE companies with Scripwise, free.</p>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/screens" className="bg-[#F97316] text-white rounded-lg px-4 py-2 hover:bg-[#EA580C]">Open pre-built screens</Link>
          <Link href="/screener" className="border border-[#E5E7EB] text-[#0D1117] rounded-lg px-4 py-2 hover:border-[#F97316]">Stock Explorer</Link>
        </div>
      </section>

      <p className="mt-8 text-xs text-[#8A96A8] leading-relaxed border-t border-[#E5E7EB] pt-4">
        <strong>Disclaimer:</strong> {DEFAULT_DISCLAIMER}
      </p>
    </article>
  );
}
