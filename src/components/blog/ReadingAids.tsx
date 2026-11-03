import type { NumberItem, TocItem } from '@/lib/enhance';

/** "Jump to a section": the page's own headings as jump links. On phones it is a collapsed list
 *  (a long list would push the article down); from 768px it is always open. Two renderings, one hidden
 *  by CSS, so nothing changes size after load. Each link is at least 44px tall for tapping. */
export function ArticleToc({ items }: { items: TocItem[] }) {
  if (items.length < 2) return null;
  const list = (
    <ol className="list-decimal pl-5 text-[15px] text-[#0D1117]">
      {items.map(i => (
        <li key={i.id}>
          <a href={`#${i.id}`} className="flex min-h-11 items-center py-1 leading-snug hover:text-[#EA580C] hover:underline">{i.text}</a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <details className="group mb-8 rounded-2xl border border-[#E5E7EB] bg-white md:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-bold uppercase tracking-wide text-[#6B7280] [&::-webkit-details-marker]:hidden">
          <span>Jump to a section <span className="font-semibold normal-case tracking-normal">({items.length})</span></span>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        <nav aria-label="Jump to a section" className="border-t border-[#F1F3F9] px-5 pb-3 pt-1">{list}</nav>
      </details>
      <nav aria-label="Jump to a section" className="mb-8 hidden rounded-2xl border border-[#E5E7EB] bg-white p-5 md:block">
        <p className="mb-1 text-sm font-bold uppercase tracking-wide text-[#6B7280]">Jump to a section</p>
        {list}
      </nav>
    </>
  );
}

/** "Numbers in this article": key figures with the sentence they come from, each linking to its paragraph. */
export function NumbersBox({ items }: { items: NumberItem[] }) {
  if (items.length < 3) return null;
  return (
    <section aria-labelledby="numbers" className="mb-8 rounded-2xl border border-[#FFEDD5] bg-[#FFF7ED] p-5">
      <h2 id="numbers" className="mb-3 text-sm font-bold uppercase tracking-wide text-[#9A3412]">Numbers in this article</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map(n => (
          <li key={n.id}>
            <a href={`#${n.id}`} className="block rounded-xl bg-white p-3 hover:ring-1 hover:ring-[#F97316]">
              <span className="block text-lg font-bold text-[#0D1117]">{n.figure}</span>
              <span className="mt-0.5 block text-sm leading-snug text-[#4A5568]">{n.text}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
