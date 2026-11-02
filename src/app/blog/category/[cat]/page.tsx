import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPublishedPosts } from '@/lib/blogDb';
import { slugify } from '@/lib/blog';
import { PostCard } from '@/components/blog/PostCard';
import { ld } from '@/components/blog/jsonLd';

const BASE = 'https://www.scripwise.co.in';
type Props = { params: Promise<{ cat: string }> };

async function load(cat: string) {
  const posts = (await getPublishedPosts()).filter(p => slugify(p.category) === cat);
  return { posts, name: posts[0]?.category ?? null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cat } = await params;
  const { posts, name } = await load(cat);
  if (!name) return { title: 'Category not found', robots: { index: false } };
  return {
    title: `${name} Articles: Indian Stock Market Blog`,
    description: `${posts.length} plain-language ${name.toLowerCase()} article${posts.length === 1 ? '' : 's'} on Indian stocks and investing from the Scripwise blog.`,
    alternates: { canonical: `/blog/category/${cat}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { cat } = await params;
  const { posts, name } = await load(cat);
  if (!name) notFound();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const all = await getPublishedPosts();
  const others = [...new Set(all.map(p => p.category))].filter(c => c !== name).sort();
  const url = `${BASE}/blog/category/${cat}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${name} articles`,
      url,
      isPartOf: { '@type': 'Blog', name: 'Scripwise Blog', url: `${BASE}/blog` },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: posts.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${BASE}/blog/${p.slug}`, name: p.title })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` },
        { '@type': 'ListItem', position: 3, name, item: url },
      ],
    },
  ];

  return (
    <div>
      {jsonLd.map((d, i) => <script key={i} type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(d) }} />)}
      <header className="hero-dark relative overflow-hidden">
        <div className="hero-grid" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-white/50">
            <Link href="/" className="inline-block py-1.5 hover:text-white">Home</Link> / <Link href="/blog" className="inline-block py-1.5 hover:text-white">Blog</Link>
          </nav>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#FB923C]">Category</p>
          <h1 className="text-3xl font-bold text-white md:text-5xl">{name}</h1>
          <p className="mt-3 text-white/60">{posts.length} article{posts.length === 1 ? '' : 's'}</p>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
        {others.length > 0 && (
          <nav aria-label="Other categories" className="mt-12">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#8A96A8]">More topics</h2>
            <div className="flex flex-wrap gap-2">
              {others.map(c => (
                <Link key={c} href={`/blog/category/${slugify(c)}`} className="rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#0D1117] hover:border-[#F97316] hover:text-[#EA580C]">{c}</Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
