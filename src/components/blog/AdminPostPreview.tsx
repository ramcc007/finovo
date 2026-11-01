'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';
import { adminFetch } from '@/lib/adminFetch';
import { DEFAULT_DISCLAIMER, formatDate, type Post } from '@/lib/blog';
import Inline from '@/components/blog/Inline';

function istTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="mb-2 text-2xl font-bold text-[#0D1117]">Post not found</h1>
      <p className="mb-6 text-[#4A5568]">This article does not exist or is not published yet.</p>
      <Link href="/blog" className="inline-block rounded-lg bg-[#F97316] px-4 py-2 font-semibold text-white hover:bg-[#EA580C]">Back to the blog</Link>
    </div>
  );
}

/** Shown on a blog 404. For the signed-in admin it loads the post whatever its status, with a preview banner. */
export default function AdminPostPreview() {
  const slug = (usePathname() ?? '').split('/').filter(Boolean)[1] ?? '';
  const { user, loading } = useAuth();
  const [fetched, setState] = useState<'checking' | 'none' | Post>('checking');
  const state = loading ? 'checking' : !user || !slug ? 'none' : fetched;

  useEffect(() => {
    if (loading || !user || !slug) return;
    let alive = true;
    adminFetch(`/api/admin/blog/preview?slug=${encodeURIComponent(slug)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive) setState(d?.data ?? 'none'); })
      .catch(() => { if (alive) setState('none'); });
    return () => { alive = false; };
  }, [user, loading, slug]);

  if (state === 'checking') return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#F97316]" /></div>;
  if (state === 'none') return <NotFound />;
  const post = state;
  const when = post.status === 'draft'
    ? 'This is a draft.'
    : post.publishedAt && new Date(post.publishedAt) > new Date()
      ? `Scheduled: it goes live on ${istTime(post.publishedAt)} IST.`
      : 'It is published.';

  return (
    <div>
      <div className="sticky top-0 z-40 border-b border-[#FED7AA] bg-[#FFF7ED]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-[#9A3412] md:px-6">
          <span className="flex items-center gap-2 font-semibold"><Eye size={16} aria-hidden /> Admin preview. {when} Visitors see a 404 until then.</span>
          <Link href={`/admin/blog/${post.id}`} className="rounded-md border border-[#FDBA74] px-2.5 py-1 text-xs font-semibold hover:bg-white">Edit</Link>
        </div>
      </div>

      <header className="hero-dark relative overflow-hidden">
        <div className="hero-grid" />
        <div className="relative mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
          <span className="inline-block rounded-full bg-[#F97316]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#FB923C]">{post.category}</span>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl">{post.title}</h1>
          <div className="mt-6 text-sm text-white/60">
            <span className="font-semibold text-white">{post.author}</span>
            {post.publishedAt && <> · {formatDate(post.publishedAt)}</>} · {post.readingMinutes} min read
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
        {post.keyTakeaways.length > 0 && (
          <section className="mb-10 rounded-2xl border border-[#FFEDD5] border-l-4 border-l-[#F97316] bg-[#FFF7ED] p-5 md:p-6">
            <h2 className="mb-3 font-bold text-[#0D1117]">Key takeaways</h2>
            <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[#4A5568]">
              {post.keyTakeaways.map((k, i) => <li key={i}><Inline text={k} /></li>)}
            </ul>
          </section>
        )}
        <div className="blog-prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
        {post.faq.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-bold text-[#0D1117]">Frequently asked questions</h2>
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
        <aside className="mt-12 rounded-2xl border border-[#FED7AA] border-l-4 border-l-[#F97316] bg-[#FFF7ED] p-5 text-[#7C2D12] md:p-6">{DEFAULT_DISCLAIMER}</aside>
      </article>
    </div>
  );
}
