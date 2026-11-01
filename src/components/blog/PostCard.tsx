import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import { formatDate, type Post } from '@/lib/blog';
import PostAdminActions from './PostAdminActions';

function Cover({ post, tall }: { post: Post; tall?: boolean }) {
  const h = tall ? 'h-full min-h-[220px]' : 'aspect-[16/9]';
  if (post.featuredImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={post.featuredImage} alt="" loading="lazy" className={`w-full ${h} object-cover transition-transform duration-500 group-hover:scale-[1.03]`} />;
  }
  return (
    <div className={`relative w-full ${h} overflow-hidden bg-gradient-to-br from-[#FB923C] via-[#F97316] to-[#C2410C]`}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 80%, #fff 0, transparent 35%)' }} />
      <span className="absolute bottom-3 left-4 text-white/90 text-xs font-semibold uppercase tracking-widest">{post.category}</span>
    </div>
  );
}

function Meta({ post }: { post: Post }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8A96A8]">
      <span className="font-semibold text-[#EA580C] uppercase tracking-wide">{post.category}</span>
      {post.publishedAt && <><span aria-hidden>·</span><time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time></>}
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1"><Clock size={11} />{post.readingMinutes} min read</span>
    </div>
  );
}

export function FeaturedPostCard({ post }: { post: Post }) {
  return (
    <article className="group grid md:grid-cols-2 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-shadow hover:shadow-lg">
      <Link href={`/blog/${post.slug}`} className="block overflow-hidden" aria-label={post.title} tabIndex={-1}>
        <Cover post={post} tall />
      </Link>
      <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
        <Meta post={post} />
        <h2 className="text-2xl md:text-3xl font-bold leading-tight text-[#0D1117]">
          <Link href={`/blog/${post.slug}`} className="hover:text-[#EA580C]">{post.title}</Link>
        </h2>
        <p className="text-[#4A5568] leading-relaxed line-clamp-3">{post.excerpt}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#EA580C] hover:underline">
            Read article <ArrowUpRight size={15} />
          </Link>
          <PostAdminActions id={post.id} title={post.title} />
        </div>
      </div>
    </article>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/blog/${post.slug}`} className="block overflow-hidden" aria-label={post.title} tabIndex={-1}>
        <Cover post={post} />
      </Link>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <Meta post={post} />
        <h2 className="text-lg font-bold leading-snug text-[#0D1117]">
          <Link href={`/blog/${post.slug}`} className="hover:text-[#EA580C]">{post.title}</Link>
        </h2>
        <p className="line-clamp-3 text-sm leading-relaxed text-[#4A5568]">{post.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 2).map(t => (
              <span key={t} className="rounded-full bg-[#FFF7ED] px-2.5 py-0.5 text-xs text-[#C2410C]">{t}</span>
            ))}
          </div>
          <PostAdminActions id={post.id} title={post.title} />
        </div>
      </div>
    </article>
  );
}
