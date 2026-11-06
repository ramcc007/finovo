import Link from 'next/link';

const LINKS = [
  { href: '/screener', label: 'Stock Explorer', note: 'Screen 5,000+ NSE and BSE companies' },
  { href: '/blog', label: 'Blog', note: 'Articles on Indian markets and investing' },
  { href: '/glossary', label: 'Glossary', note: 'Investing terms explained simply' },
];

/** Site-wide 404 for any URL without its own not-found page. */
export default function NotFoundContent() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center md:py-28">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#EA580C]">404</p>
      <h1 className="mt-2 text-3xl font-bold text-[#0D1117] md:text-4xl">We could not find that page</h1>
      <p className="mx-auto mt-3 max-w-md text-[#4A5568]">The link may be old or mistyped. These are good places to start:</p>
      <ul className="mt-8 grid gap-3 text-left sm:grid-cols-3">
        {LINKS.map(l => (
          <li key={l.href}>
            <Link href={l.href} className="block h-full rounded-2xl border border-[#E5E7EB] bg-white p-4 hover:border-[#F97316]">
              <span className="block font-semibold text-[#0D1117]">{l.label}</span>
              <span className="mt-1 block text-sm text-[#4A5568]">{l.note}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-lg bg-[#F97316] px-5 font-semibold text-white hover:bg-[#EA580C]">Go to the home page</Link>
      </p>
    </div>
  );
}
