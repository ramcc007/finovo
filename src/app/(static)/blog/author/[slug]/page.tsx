import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { getAuthor } from '@/lib/authorsDb';
import { getPublishedPosts } from '@/lib/blogDb';
import { initials } from '@/lib/authors';
import { PostCard } from '@/components/blog/PostCard';
import { ld } from '@/components/blog/jsonLd';

const BASE = 'https://www.scripwise.co.in';
const PER_PAGE = 12;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getAuthor((await params).slug);
  if (!a) return { title: 'Author not found', robots: { index: false } };
  const title = `${a.name}${a.role ? `, ${a.role}` : ''} | Scripwise`;
  const description = a.bio || `Articles by ${a.name} on the Scripwise blog: Indian stock market, mutual funds, tax and investing guides in plain language.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/blog/author/${a.slug}` },
    openGraph: { type: 'profile', url: `${BASE}/blog/author/${a.slug}`, title, description, ...(a.photoUrl ? { images: [{ url: a.photoUrl }] } : {}) },
    twitter: { card: 'summary', title, description },
  };
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const [{ slug }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const a = await getAuthor(slug);
  if (!a) notFound();
  const all = (await getPublishedPosts()).filter(p => p.author === a.name);
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(pageParam) || 1));
  const posts = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const nonce: string | undefined = undefined; // JSON-LD blocks are data, not executed script, so they need no CSP nonce
  const url = `${BASE}/blog/author/${a.slug}`;
  const sameAs = Object.values(a.links).filter(Boolean);

  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'ProfilePage', url, name: `${a.name} on Scripwise`,
      mainEntity: {
        '@type': 'Person', '@id': `${url}#person`, name: a.name, url,
        ...(a.role ? { jobTitle: a.role } : {}), ...(a.bio ? { description: a.bio } : {}),
        ...(a.photoUrl ? { image: a.photoUrl } : {}),
        ...(a.location ? { homeLocation: { '@type': 'Place', name: a.location } } : {}),
        ...(a.beats.length ? { knowsAbout: a.beats } : {}),
        ...(sameAs.length ? { sameAs } : {}),
        worksFor: { '@type': 'Organization', name: 'Scripwise', url: BASE },
      },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` },
        { '@type': 'ListItem', position: 3, name: a.name, item: url },
      ],
    },
  ];

  return (
    <div>
      {jsonLd.map((d, i) => <script key={i} type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ld(d) }} />)}
      <header className="hero-dark relative overflow-hidden">
        <div className="hero-grid" />
        <div className="relative mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-white/50">
            <Link href="/" className="inline-block py-1.5 hover:text-white">Home</Link> / <Link href="/blog" className="inline-block py-1.5 hover:text-white">Blog</Link> / <span>{a.name}</span>
          </nav>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {a.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.photoUrl} alt={a.name} width={128} height={128} className="h-28 w-28 shrink-0 rounded-full object-cover ring-4 ring-white/10 sm:h-32 sm:w-32" />
            ) : (
              <span aria-hidden className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-3xl font-bold text-white sm:h-32 sm:w-32">{initials(a.name)}</span>
            )}
            <div className="min-w-0">
              <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">{a.name}</h1>
              {(a.role || a.location) && (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
                  {a.role && <span className="font-semibold text-[#FB923C]">{a.role}</span>}
                  {a.location && <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden /> {a.location}</span>}
                </p>
              )}
              {a.bio && <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">{a.bio}</p>}
              {a.beats.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Writes about">
                  {a.beats.map(b => <li key={b} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">{b}</li>)}
                </ul>
              )}
              {sameAs.length > 0 && (
                <p className="mt-4 flex flex-wrap gap-4 text-sm">
                  {a.links.x && <a href={a.links.x} target="_blank" rel="noopener noreferrer me" className="font-semibold text-white/80 underline-offset-2 hover:text-white hover:underline">X (Twitter) ↗</a>}
                  {a.links.linkedin && <a href={a.links.linkedin} target="_blank" rel="noopener noreferrer me" className="font-semibold text-white/80 underline-offset-2 hover:text-white hover:underline">LinkedIn ↗</a>}
                  {a.links.website && <a href={a.links.website} target="_blank" rel="noopener noreferrer me" className="font-semibold text-white/80 underline-offset-2 hover:text-white hover:underline">Website ↗</a>}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
        <h2 className="mb-6 text-2xl font-bold text-[#0D1117]">Articles by {a.name} <span className="text-base font-semibold text-[#8A96A8]">({all.length})</span></h2>
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-12 text-center text-[#4A5568]">No published articles yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{posts.map(p => <PostCard key={p.id} post={p} />)}</div>
        )}
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3 text-sm font-semibold">
            {page > 1 && <Link href={page === 2 ? `/blog/author/${a.slug}` : `/blog/author/${a.slug}?page=${page - 1}`} className="inline-flex min-h-10 items-center rounded-full border border-[#E5E7EB] bg-white px-4 hover:border-[#F97316]">← Newer</Link>}
            <span className="text-[#8A96A8]">Page {page} of {pages}</span>
            {page < pages && <Link href={`/blog/author/${a.slug}?page=${page + 1}`} rel="nofollow" className="inline-flex min-h-10 items-center rounded-full border border-[#E5E7EB] bg-white px-4 hover:border-[#F97316]">Older →</Link>}
          </nav>
        )}
      </main>
    </div>
  );
}
