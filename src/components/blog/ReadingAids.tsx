import type { NumberItem, TocItem } from '@/lib/enhance';

/** "Jump to a section": the page's own headings as jump links. */
export function ArticleToc({ items }: { items: TocItem[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Jump to a section" className="mb-8 rounded-2xl border border-[#E5E7EB] bg-white p-5">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#6B7280]">Jump to a section</h2>
      <ol className="list-decimal space-y-1.5 pl-5 text-[15px] text-[#0D1117]">
        {items.map(i => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="hover:text-[#EA580C] hover:underline">{i.text}</a>
          </li>
        ))}
      </ol>
    </nav>
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
