import LocalTime from './LocalTime';
import type { Chamber, Scoreboard as SB } from '@/lib/election/types';

const ROWS: { id: Chamber; label: string }[] = [
  { id: 'senate', label: 'Senate' }, { id: 'house', label: 'House' }, { id: 'governors', label: 'Governors' },
];
const n = (v: number | null | undefined) => (v === null || v === undefined ? '-' : String(v));

export default function Scoreboard({ board }: { board: SB }) {
  const rows = ROWS.filter(r => board[r.id]);
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-white px-5 py-4 text-sm text-[#4A5568]">
        Seat counts will be shown here once they have been confirmed from the reports below.
      </p>
    );
  }
  return (
    <section aria-labelledby="scoreboard" className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
      <h2 id="scoreboard" className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1117]">Seat count so far</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-[#8A96A8]">
            <tr>
              <th className="px-3 py-2 font-semibold sm:px-5">Chamber</th>
              <th className="px-2 py-2 text-right font-semibold text-[#1D4ED8] sm:px-3"><span className="sm:hidden">Dem</span><span className="hidden sm:inline">Democrats</span></th>
              <th className="px-2 py-2 text-right font-semibold text-[#B91C1C] sm:px-3"><span className="sm:hidden">Rep</span><span className="hidden sm:inline">Republicans</span></th>
              <th className="px-2 py-2 text-right font-semibold sm:px-3"><span className="sm:hidden">Oth</span><span className="hidden sm:inline">Others</span></th>
              <th className="px-3 py-2 text-right font-semibold sm:px-5"><span className="sm:hidden">Open</span><span className="hidden sm:inline">Not called</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F3F9]">
            {rows.map(r => {
              const e = board[r.id]!;
              return (
                <tr key={r.id}>
                  <th scope="row" className="px-3 py-3 text-left font-semibold text-[#0D1117] sm:px-5">{r.label}</th>
                  <td className="tnum px-2 py-3 text-right text-lg font-bold text-[#1D4ED8] sm:px-3">{n(e.d)}</td>
                  <td className="tnum px-2 py-3 text-right text-lg font-bold text-[#B91C1C] sm:px-3">{n(e.r)}</td>
                  <td className="tnum px-2 py-3 text-right text-[#4A5568] sm:px-3">{n(e.other)}</td>
                  <td className="tnum px-3 py-3 text-right text-[#4A5568] sm:px-5">{n(e.uncalled)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[#E5E7EB] px-5 py-2.5 text-xs text-[#8A96A8]">
        As per {[...new Set(rows.map(r => board[r.id]!.source).filter(Boolean))].join(' and ') || 'the sources credited below'}.
        {rows[0] && board[rows[0].id]!.updatedAt && <> Last updated <LocalTime iso={rows.map(r => board[r.id]!.updatedAt!).sort().at(-1)!} />.</>}
      </p>
    </section>
  );
}
