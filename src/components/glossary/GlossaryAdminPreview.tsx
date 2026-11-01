'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';
import { adminFetch } from '@/lib/adminFetch';
import type { GlossaryTerm } from '@/lib/glossary';
import GlossaryArticle from '@/components/glossary/GlossaryArticle';

type Loaded = { term: GlossaryTerm; related: { slug: string; term: string }[] };

function istTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

/** Shown on a glossary 404. For the signed-in admin it loads the term whatever its status, with a preview banner. */
export default function GlossaryAdminPreview() {
  const slug = (usePathname() ?? '').split('/').filter(Boolean)[1] ?? '';
  const { user, loading } = useAuth();
  const [fetched, setFetched] = useState<'checking' | 'none' | Loaded>('checking');
  const state = loading ? 'checking' : !user || !slug ? 'none' : fetched;

  useEffect(() => {
    if (loading || !user || !slug) return;
    let alive = true;
    adminFetch(`/api/admin/glossary/preview?slug=${encodeURIComponent(slug)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive) setFetched(d?.data ?? 'none'); })
      .catch(() => { if (alive) setFetched('none'); });
    return () => { alive = false; };
  }, [user, loading, slug]);

  if (state === 'checking') return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#F97316]" /></div>;
  if (state === 'none') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-2 text-2xl font-bold text-[#0D1117]">Term not found</h1>
        <p className="mb-6 text-[#4A5568]">This glossary term does not exist or is not published yet.</p>
        <Link href="/glossary" className="inline-block rounded-lg bg-[#F97316] px-4 py-2 font-semibold text-white hover:bg-[#EA580C]">All glossary terms</Link>
      </div>
    );
  }
  const { term } = state;
  const when = term.status === 'draft'
    ? 'This is a draft.'
    : term.publishedAt && new Date(term.publishedAt) > new Date()
      ? `Scheduled: it goes live on ${istTime(term.publishedAt)} IST.`
      : 'It is published.';
  return (
    <div>
      <div className="sticky top-0 z-40 border-b border-[#FED7AA] bg-[#FFF7ED]">
        <div className="mx-auto max-w-3xl px-4 py-2 text-sm font-semibold text-[#9A3412] md:px-6">
          <span className="flex items-center gap-2"><Eye size={16} aria-hidden /> Admin preview. {when} Visitors see a 404 until then.</span>
        </div>
      </div>
      <GlossaryArticle term={term} related={state.related} />
    </div>
  );
}
