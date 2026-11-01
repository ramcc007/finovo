import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPublishedPost, getPublishedPosts } from '@/lib/blogDb';
import { PostCard } from '@/components/blog/PostCard';
import { formatDate, stripHtml, DEFAULT_DISCLAIMER } from '@/lib/blog';
import Inline from '@/components/blog/Inline';
import PostAdminActions from '@/components/blog/PostAdminActions';
import ShareBar from '@/components/blog/ShareBar';
import { categoryHref } from '@/components/blog/categories';
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
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const url = `${BASE}/blog/${post.slug}`;
  const related = (await getPublishedPosts()).filter(p => p.slug !== post.slug).slice(0, 3);

  const jsonLd: unknown[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.metaDescription || post.excerpt,
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      datePublished: post.publishedAt,
      dateCreated: post.createdAt,
      ...(post.sources.length ? { citation: post.sources.map(s => ({ '@type': 'CreativeWork', name: s.name, url: s.url })) } : {}),
      dateModified: post.updatedAt,
      author: { '@type': 'Organization', name: post.author },
      publisher: { '@type': 'Organization', name: 'Scripwise', url: BASE },
      articleSection: post.category,
      keywords: post.tags.join(', '),
      inLanguage: 'en-IN',
      wordCount: stripHtml(post.contentHtml).split(' ').filter(Boolean).length,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` },
        { '@type': 'ListItem', position: 3, name: post.category, item: `${BASE}${categoryHref(post.category)}` },
        { '@type': 'ListItem', position: 4, name: post.title, item: url },
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
    <div>
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(d) }} />
      ))}

      <header className="hero-dark relative overflow-hidden">
        <div className="hero-grid" />
        <div className="relative mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
          <div className="mb-5 flex items-center justify-between gap-3">
            <nav aria-label="Breadcrumb" className="text-xs text-white/50">
              <Link href="/" className="hover:text-white">Home</Link> / <Link href="/blog" className="hover:text-white">Blog</Link>
            </nav>
            <PostAdminActions id={post.id} title={post.title} redirectTo="/blog" />
          </div>
          <Link href={categoryHref(post.category)} className="inline-block rounded-full bg-[#F97316]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#FB923C] hover:bg-[#F97316]/25">{post.category}</Link>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl">{post.title}</h1>
          <div className="mt-6 flex items-center gap-3 text-sm text-white/60">
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-sm font-bold text-white">
              {post.author.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <div className="leading-tight">
              <div className="font-semibold text-white">{post.author}</div>
              <div className="text-xs">
                {post.publishedAt && <>Published <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> · </>}
                {post.readingMinutes} min read
              </div>
            </div>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
        {post.keyTakeaways.length > 0 && (
          <section aria-labelledby="key-takeaways" className="mb-10 rounded-2xl border border-[#FFEDD5] border-l-4 border-l-[#F97316] bg-[#FFF7ED] p-5 md:p-6">
            <h2 id="key-takeaways" className="mb-3 font-bold text-[#0D1117]">Key takeaways</h2>
            <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[#4A5568]">
              {post.keyTakeaways.map((k, i) => <li key={i}><Inline text={k} /></li>)}
            </ul>
          </section>
        )}

        <div className="blog-prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map(t => (
            <span key={t} className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs text-[#C2410C]">{t}</span>
          ))}
        </div>

        {post.faq.length > 0 && (
          <section aria-labelledby="faq" className="mt-12">
            <h2 id="faq" className="mb-4 text-2xl font-bold text-[#0D1117]">Frequently asked questions</h2>
            <div className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB] bg-white">
              {post.faq.map((f, i) => (
                <div key={i} className="p-5">
                  <h3 className="mb-1 font-semibold text-[#0D1117]">{f.q}</h3>
                  <p className="leading-relaxed text-[#4A5568]">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {post.sources.length > 0 && (
          <section aria-labelledby="sources" className="mt-12">
            <h2 id="sources" className="mb-3 text-lg font-bold text-[#0D1117]">Sources &amp; credits</h2>
            <p className="mb-3 text-sm text-[#4A5568]">Facts and figures in this article draw on these sources. All writing is our own.</p>
            <ul className="flex flex-wrap gap-2">
              {post.sources.map(s => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#EA580C] hover:border-[#F97316]">
                    {s.name} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ShareBar url={url} title={post.title} />

        <section className="mt-12 rounded-2xl bg-[#0B0E14] p-6 text-white md:p-8">
          <h2 className="text-xl font-bold">Screen stocks yourself</h2>
          <p className="mt-1 mb-4 text-sm text-white/60">Run quality filters on 5,000+ NSE &amp; BSE companies with Scripwise, free.</p>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/screens" className="rounded-lg bg-[#F97316] px-4 py-2 text-white hover:bg-[#EA580C]">Open pre-built screens</Link>
            <Link href="/screener" className="rounded-lg border border-white/20 px-4 py-2 text-white hover:border-[#F97316]">Stock Explorer</Link>
          </div>
        </section>

        <aside aria-labelledby="disclaimer" className="mt-10 rounded-2xl border border-[#FED7AA] border-l-4 border-l-[#F97316] bg-[#FFF7ED] p-5 md:p-6">
          <h2 id="disclaimer" className="mb-2 flex items-center gap-2 text-lg font-bold text-[#9A3412]">
            <ShieldAlert size={20} aria-hidden /> Disclaimer
          </h2>
          <p className="text-base leading-relaxed text-[#7C2D12]">{DEFAULT_DISCLAIMER}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#9A3412]">
            Scripwise is not registered with SEBI as an investment adviser or research analyst. Figures are taken from
            {post.sources.length > 0 ? ' the sources credited above' : ' public reports'} and may change; please verify them before acting on them.
          </p>
        </aside>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="more" className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
            <h2 id="more" className="mb-6 text-2xl font-bold text-[#0D1117]">Keep reading</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
