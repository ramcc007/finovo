import Link from 'next/link';

export interface ToolIntroProps {
  /** h2 for the section. The page's h1 comes from the tool itself (or its loading state). */
  heading: string;
  intro: string[];
  points?: string[];
  links?: { href: string; label: string }[];
  faq?: { q: string; a: string }[];
  /** Optional extra block (for example a table of index levels) shown after the intro. */
  children?: React.ReactNode;
}

/**
 * Plain, server-rendered text under a tool page. The tools themselves load in the browser behind a sign-in or preview
 * check, so without this a crawler that does not run scripts sees only a loading spinner.
 */
export default function ToolIntro({ heading, intro, points, links, faq, children }: ToolIntroProps) {
  return (
    <section aria-label={heading} className="border-t border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <h2 className="text-xl font-bold text-[#0D1117] md:text-2xl">{heading}</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#4A5568]">
          {intro.map(p => <p key={p}>{p}</p>)}
        </div>
        {children}
        {points && points.length > 0 && (
          <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#4A5568]">
            {points.map(p => <li key={p}>{p}</li>)}
          </ul>
        )}
        {faq && faq.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-semibold text-[#0D1117]">Frequently asked questions</h3>
            <dl className="mt-3 space-y-4">
              {faq.map(f => (
                <div key={f.q}>
                  <dt className="text-sm font-semibold text-[#0D1117]">{f.q}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-[#4A5568]">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {links && links.length > 0 && (
          <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            {links.map(l => <Link key={l.href} href={l.href} className="text-[#EA580C] hover:underline">{l.label}</Link>)}
          </p>
        )}
        <p className="mt-8 text-xs text-[#8A96A8]">Scripwise is an information tool and does not give investment advice.</p>
      </div>
    </section>
  );
}
