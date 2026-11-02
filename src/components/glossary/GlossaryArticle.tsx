import Link from 'next/link';
import ShareBar from '@/components/blog/ShareBar';
import ContentDisclaimer from '@/components/blog/ContentDisclaimer';
import type { GlossaryTerm } from '@/lib/glossary';

/** The body of a glossary term page. Pure markup, so the public page and the admin preview share it. */
export default function GlossaryArticle({ term, related }: { term: GlossaryTerm; related: { slug: string; term: string }[] }) {
  return (
    <div>
      <header className="hero-dark relative overflow-hidden">
        <div className="hero-grid" />
        <div className="relative mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-5 text-xs text-white/50">
            <Link href="/" className="hover:text-white">Home</Link> / <Link href="/glossary" className="hover:text-white">Glossary</Link>
          </nav>
          <span className="inline-block rounded-full bg-[#F97316]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#FB923C]">Glossary · {term.category}</span>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl">{term.title}</h1>
          <div className="mt-5 text-sm text-white/60">
            {term.readingMinutes} min read
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
        <div className="blog-prose" dangerouslySetInnerHTML={{ __html: term.contentHtml }} />

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
                  <Link href={`/glossary/${r.slug}`} className="inline-block rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#EA580C] hover:border-[#F97316]">
                    {r.term}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ContentDisclaimer />

        <ShareBar url={`https://www.scripwise.co.in/glossary/${term.slug}`} title={term.title} />

        <p className="mt-12 text-sm text-[#4A5568]">
          <Link href="/glossary" className="font-semibold text-[#EA580C] hover:underline">← All glossary terms</Link>
        </p>
      </article>
    </div>
  );
}
