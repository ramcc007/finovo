import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SECTIONS, SECTION_IDS, listRaces, racePath } from '@/lib/election/sections';
import type { ElectionUpdate } from '@/lib/election/types';

const BLURB: Record<string, string> = {
  senate: 'Control of the Senate, race calls and forecasts',
  house: 'All 435 seats, majority and key districts',
  governors: '36 state governor races',
  markets: 'Impact on US, European and Indian markets',
};

/** The only place on the site that links to the section and race pages. */
export default function ExploreLinks({ updates }: { updates: ElectionUpdate[] }) {
  const races = listRaces(updates).slice(0, 12);
  return (
    <section aria-labelledby="explore-h" className="mt-8">
      <h2 id="explore-h" className="mb-4 text-2xl font-extrabold tracking-tight text-[#0D1117]">Follow the races</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECTION_IDS.map(id => (
          <Link key={id} href={SECTIONS[id].path} className="group flex min-h-24 flex-col justify-between rounded-2xl bg-white p-4 ring-1 ring-[#E5E7EB] transition-shadow hover:shadow-md hover:ring-[#F97316]">
            <span className="flex items-center justify-between font-bold text-[#0D1117]">{SECTIONS[id].name}<ArrowRight size={16} aria-hidden className="text-[#8A96A8] transition-transform group-hover:translate-x-1 group-hover:text-[#EA580C]" /></span>
            <span className="mt-1 text-sm text-[#4A5568]">{BLURB[id]}</span>
          </Link>
        ))}
      </div>
      {races.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#4A5568]">Races to watch</h3>
          <ul className="flex flex-wrap gap-2">
            {races.map(r => (
              <li key={r.slug}>
                <Link href={racePath(r.slug)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#0D1117] ring-1 ring-[#E5E7EB] hover:ring-[#F97316]">
                  {r.name}
                  {r.count > 0 && <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-xs text-[#C2410C]">{r.count}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
