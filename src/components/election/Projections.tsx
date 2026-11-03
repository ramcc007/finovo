import PtTime from './PtTime';
import type { Chamber, Projection } from '@/lib/election/types';

const ORDER: { id: Chamber; label: string }[] = [
  { id: 'senate', label: 'Senate' }, { id: 'house', label: 'House of Representatives' }, { id: 'governors', label: 'Governors' },
];
const PARTY = { D: { name: 'Democrats', text: 'text-[#1D4ED8]', bar: 'bg-[#3B82F6]', pill: 'bg-blue-50 text-blue-700 ring-blue-600/20' }, R: { name: 'Republicans', text: 'text-[#B91C1C]', bar: 'bg-[#EF4444]', pill: 'bg-red-50 text-red-700 ring-red-600/20' } } as const;

/** Race calls and forecasts reported by named organisations. Never our own prediction. */
export default function Projections({ items }: { items: Projection[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="proj-h" className="mb-10 scroll-mt-24">
      <h2 id="proj-h" className="mb-1 text-2xl font-extrabold tracking-tight text-[#0D1117]">Projections and forecasts</h2>
      <p className="mb-4 text-sm text-[#4A5568]">Calls and forecasts made by the organisations named below, as reported by news publishers. They are not results.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ORDER.map(c => {
          const mine = items.filter(p => p.chamber === c.id).sort((a, b) => b.at.localeCompare(a.at));
          if (mine.length === 0) return null;
          return (
            <div key={c.id} className="rounded-2xl bg-white p-4 ring-1 ring-[#E5E7EB]">
              <h3 className="mb-2 font-bold text-[#0D1117]">{c.label}</h3>
              <ul className="space-y-3">
                {mine.slice(0, 3).map(p => {
                  const party = PARTY[p.party ?? 'D'];
                  return (
                    <li key={`${p.kind}-${p.by}`}>
                      {p.kind === 'called' ? (
                        <p className="text-[15px] font-semibold text-[#0D1117]">
                          <span className={`mr-2 inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase ring-1 ring-inset ${party.pill}`}>Called</span>
                          For <span className={party.text}>{party.name}</span>
                        </p>
                      ) : (
                        <div>
                          <p className="text-[15px] font-semibold text-[#0D1117]">
                            <span className={party.text}>{party.name}</span> {p.probability}% to win
                          </p>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#EEF1F7]" role="img" aria-label={`${party.name} ${p.probability} percent`}>
                            <div className={`h-full ${party.bar}`} style={{ width: `${p.probability ?? 0}%` }} />
                          </div>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-[#8A96A8]">
                        {p.kind === 'called' ? 'Call' : 'Forecast'} by {p.by}, via{' '}
                        <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold underline underline-offset-2 hover:text-[#EA580C]">{p.source} ↗</a>
                        {' · '}<PtTime iso={p.at} />
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
