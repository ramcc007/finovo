import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import { formatDate, type Post } from '@/lib/blog';
import PostAdminActions from './PostAdminActions';
import { categoryHref } from './categories';

// Text-only design: hierarchy comes from type, colour accents and spacing.

function Initials({ name, dark }: { name: string; dark?: boolean }) {
  const letters = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${dark ? 'bg-white/10 text-white' : 'bg-[#FFF7ED] text-[#C2410C]'}`}>
      {letters}
    </span>
  );
}

function ByLine({ post, dark }: { post: Post; dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Initials name={post.author} dark={dark} />
      <div className={`text-xs leading-tight ${dark ? 'text-white/55' : 'text-[#8A96A8]'}`}>
        <div className={`font-semibold ${dark ? 'text-white/90' : 'text-[#0D1117]'}`}>{post.author}</div>
        <div className="flex items-center gap-1.5">
          {post.publishedAt && <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1"><Clock size={10} />{post.readingMinutes} min</span>
        </div>
      </div>
    </div>
  );
}

export function FeaturedPostCard({ post }: { post: Post }) {
  return (
    <article className="group relative overflow-hidden rounded-3xl bg-[#0B0E14] p-7 shadow-sm md:p-12">
      <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F97316]/20 blur-3xl" />
      <div className="relative max-w-3xl">
        <span className="inline-block rounded-full bg-[#F97316]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#FB923C]">
          Latest · <Link href={categoryHref(post.category)} className="hover:text-white">{post.category}</Link>
        </span>
        <h2 className="mt-5 text-2xl font-bold leading-tight text-white md:text-4xl">
          <Link href={`/blog/${post.slug}`} className="hover:text-[#FB923C]">{post.title}</Link>
        </h2>
        <p className="mt-4 line-clamp-3 text-base leading-relaxed text-white/60 md:text-lg">{post.excerpt}</p>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <ByLine post={post} dark />
          <div className="flex items-center gap-4">
            <PostAdminActions id={post.id} title={post.title} />
            <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-1 rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#EA580C]">
              Read article <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#F97316]/40 hover:shadow-lg">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FB923C] to-[#EA580C]" />
      <Link href={categoryHref(post.category)} className="relative z-10 mb-3 self-start text-xs font-semibold uppercase tracking-wide text-[#EA580C] hover:underline">{post.category}</Link>
      <h2 className="text-xl font-bold leading-snug text-[#0D1117]">
        <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 hover:text-[#EA580C]">{post.title}</Link>
      </h2>
      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-[#4A5568]">{post.excerpt}</p>
      <div className="mt-auto pt-5">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 2).map(t => (
            <span key={t} className="rounded-full bg-[#FFF7ED] px-2.5 py-0.5 text-xs text-[#C2410C]">{t}</span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#F1F3F9] pt-4">
          <ByLine post={post} />
          <div className="relative z-10"><PostAdminActions id={post.id} title={post.title} /></div>
        </div>
      </div>
    </article>
  );
}
