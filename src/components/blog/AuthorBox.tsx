import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { authorHref, initials } from '@/lib/authors';
import { getAuthorByName } from '@/lib/authorsDb';

/** "About the author" box at the end of an article. Shows what the admin has filled in; never invents anything. */
export default async function AuthorBox({ name }: { name: string }) {
  const a = await getAuthorByName(name);
  const href = authorHref(name);
  const links = a ? ([['x', 'X (Twitter)'], ['linkedin', 'LinkedIn'], ['website', 'Website']] as const).filter(([k]) => a.links[k]) : [];
  return (
    <section aria-labelledby="about-author" className="mt-12 rounded-2xl border border-[#E5E7EB] bg-white p-5 md:p-6">
      <h2 id="about-author" className="mb-4 text-xs font-bold uppercase tracking-wide text-[#8A96A8]">About the author</h2>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link href={href} className="shrink-0" aria-label={`More articles by ${name}`}>
          {a?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.photoUrl} alt={name} width={80} height={80} loading="lazy" className="h-20 w-20 rounded-full object-cover ring-1 ring-black/5" />
          ) : (
            <span aria-hidden className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-xl font-bold text-white">{initials(name)}</span>
          )}
        </Link>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-[#0D1117]"><Link href={href} className="hover:text-[#EA580C]">{name}</Link></h3>
          {(a?.role || a?.location) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#4A5568]">
              {a?.role && <span className="font-semibold text-[#EA580C]">{a.role}</span>}
              {a?.location && <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden /> {a.location}</span>}
            </p>
          )}
          {a?.bio && <p className="mt-2 text-[15px] leading-relaxed text-[#4A5568]">{a.bio}</p>}
          {a && a.beats.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Writes about">
              {a.beats.map(b => <li key={b} className="rounded-full bg-[#FFF7ED] px-2.5 py-0.5 text-xs font-semibold text-[#C2410C]">{b}</li>)}
            </ul>
          )}
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
            <Link href={href} className="text-[#EA580C] hover:underline">More articles by {name.split(' ')[0]} →</Link>
            {links.map(([k, label]) => (
              <a key={k} href={a!.links[k]} target="_blank" rel="noopener noreferrer me" className="text-[#4A5568] hover:text-[#EA580C]">{label} ↗</a>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
