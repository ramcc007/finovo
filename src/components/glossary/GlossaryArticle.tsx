import Link from 'next/link';
import type { Enhanced } from '@/lib/enhance';
import { ArticleToc } from '@/components/blog/ReadingAids';
import ReadingProgress from '@/components/blog/ReadingProgress';
import GlossaryCards from '@/components/blog/GlossaryCards';
import ShareBar from '@/components/blog/ShareBar';
import ContentDisclaimer from '@/components/blog/ContentDisclaimer';
import type { GlossaryTerm } from '@/lib/glossary';
import ContentSearch from '@/components/search/ContentSearch';
import BookmarkButton from '@/components/election/BookmarkButton';
import { styleOf } from '@/lib/glossaryHub';
import { ArrowLeft, ArrowRight, BarChart3 } from 'lucide-react';
import { formatDate } from '@/lib/blog';

/** The body of a glossary term page. Pure markup, so the public page and the admin preview share it. */
type Ref = { slug: string; term: string };

export default function GlossaryArticle({ term, related, aids, more = [], prev = null, next = null }: { term: GlossaryTerm; related: Ref[]; aids?: Enhanced; more?: (Ref & { definition: string })[]; prev?: Ref | null; next?: Ref | null }) {
  return (
    <div>
      <header className="hero-dark hero-open relative">
        <div className="hero-grid" />
        <div className="relative mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-white/50">
            <Link href="/" className="inline-flex min-h-11 items-center hover:text-white">Home</Link> / <Link href="/glossary" className="inline-flex min-h-11 items-center hover:text-white">Glossary</Link>
          </nav>
          <Link href={`/glossary?cat=${encodeURIComponent(term.category)}`} rel="nofollow" className="inline-block rounded-full bg-[#F97316]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#FB923C] hover:bg-[#F97316]/25">Glossary · {term.category}</Link>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl">{term.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/60">
            <span>{term.readingMinutes} min read</span>
            {term.updatedAt && <span>Updated {formatDate(term.updatedAt)}</span>}
            <BookmarkButton dark url={`https://www.scripwise.co.in/glossary/${term.slug}`} title={term.title} />
          </div>
          <div className="mt-6 max-w-xl"><ContentSearch id="term-search" type="glossary" placeholder="Search another term" fullHref="/glossary" /></div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
        {aids && <ArticleToc items={aids.toc} />}
        <ReadingProgress targetId="article-body" />
        <div id="article-body" className="blog-prose" dangerouslySetInnerHTML={{ __html: aids?.html ?? term.contentHtml }} />
        <GlossaryCards targetId="article-body" />

        {term.faq.length > 0 && (
          <section aria-labelledby="faq" className="mt-12">
            <h2 id="faq" className="mb-4 text-2xl font-bold text-[#0D1117]">Frequently asked questions</h2>
            <div className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB] bg-white">
              {term.faq.map((f, i) => (
                <div key={i} className="p-5">
                  <h3 className="mb-1 font-semibold text-[#0D1117]">{f.q}</h3>
                  <p className="leading-relaxed text-[#4A5568]">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related" className="mt-12">
            <h2 id="related" className="mb-3 text-lg font-bold text-[#0D1117]">Related terms</h2>
            <ul className="flex flex-wrap gap-2">
              {related.map(r => (
                <li key={r.slug}>
                  <Link href={`/glossary/${r.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#EA580C] hover:border-[#F97316]">
                    {r.term}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {more.length > 0 && (
          <section aria-labelledby="more" className="mt-12">
            <div className="mb-3 flex items-end justify-between gap-2">
              <h2 id="more" className="text-lg font-bold text-[#0D1117]">More in {term.category}</h2>
              <Link href={`/glossary?cat=${encodeURIComponent(term.category)}`} rel="nofollow" className="text-sm font-semibold text-[#EA580C] hover:underline">See all</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {more.map(m => (
                <li key={m.slug}>
                  <Link href={`/glossary/${m.slug}`} className="block h-full rounded-xl border border-[#E5E7EB] bg-white p-4 hover:border-[#F97316]">
                    <span className="flex items-center gap-2 font-semibold text-[#0D1117]"><span className={`h-2 w-2 rounded-full ${styleOf(term.category).dot}`} aria-hidden />{m.term}</span>
                    <span className="mt-1 line-clamp-2 block text-sm text-[#4A5568]">{m.definition}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link href="/screener" className="group mt-12 flex items-center gap-4 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] p-5 hover:border-[#F97316]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#EA580C]"><BarChart3 size={22} aria-hidden /></span>
          <span className="min-w-0 flex-1"><span className="block font-bold text-[#0D1117]">See it in the screener</span><span className="block text-sm text-[#4A5568]">Filter NSE and BSE stocks on ratios like this one.</span></span>
          <ArrowRight size={18} className="shrink-0 text-[#EA580C] transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>

        <ContentDisclaimer />

        <ShareBar url={`https://www.scripwise.co.in/glossary/${term.slug}`} title={term.title} />

        {(prev || next) && (
          <nav aria-label="Neighbouring terms" className="mt-12 grid gap-3 sm:grid-cols-2">
            {prev ? <Link href={`/glossary/${prev.slug}`} className="group flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 hover:border-[#F97316]"><ArrowLeft size={16} className="shrink-0 text-[#9CA3AF] group-hover:text-[#EA580C]" aria-hidden /><span className="min-w-0"><span className="block text-xs text-[#8A96A8]">Previous term</span><span className="block truncate font-semibold text-[#0D1117]">{prev.term}</span></span></Link> : <span />}
            {next ? <Link href={`/glossary/${next.slug}`} className="group flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 text-right hover:border-[#F97316]"><span className="min-w-0"><span className="block text-xs text-[#8A96A8]">Next term</span><span className="block truncate font-semibold text-[#0D1117]">{next.term}</span></span><ArrowRight size={16} className="shrink-0 text-[#9CA3AF] group-hover:text-[#EA580C]" aria-hidden /></Link> : <span />}
          </nav>
        )}

        <p className="mt-8 text-sm text-[#4A5568]">
          <Link href="/glossary" className="inline-flex min-h-11 items-center font-semibold text-[#EA580C] hover:underline">← All glossary terms</Link>
        </p>
      </article>
    </div>
  );
}
