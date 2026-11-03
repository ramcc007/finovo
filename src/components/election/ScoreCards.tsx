import PtTime from './PtTime';
import type { Chamber, Projection, ScoreEntry, Scoreboard } from '@/lib/election/types';

const ROWS: { id: Chamber; label: string; sub: string }[] = [
  { id: 'senate', label: 'Senate', sub: '100 seats' },
  { id: 'house', label: 'House', sub: '435 seats' },
  { id: 'governors', label: 'Governors', sub: '36 races' },
];
const n = (v: number | null | undefined) => (v === null || v === undefined ? '-' : String(v));

function Bar({ e }: { e: ScoreEntry }) {
  const parts = [
    { v: e.d ?? 0, cls: 'bg-[#3B82F6]', label: 'Democrats' },
    { v: e.other ?? 0, cls: 'bg-[#A78BFA]', label: 'Others' },
    { v: e.uncalled ?? 0, cls: 'bg-white/25', label: 'Not called' },
    { v: e.r ?? 0, cls: 'bg-[#EF4444]', label: 'Republicans' },
  ];
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  return (
    <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/10" role="img"
      aria-label={`Democrats ${n(e.d)}, Republicans ${n(e.r)}, others ${n(e.other)}, not called ${n(e.uncalled)}`}>
      {parts.map(p => <div key={p.label} className={p.cls} style={{ width: `${(p.v / total) * 100}%` }} />)}
    </div>
  );
}

/** Seat counts as three large cards, for the dark page header. Values come only from admin-approved numbers. */
export default function ScoreCards({ board, projections = [] }: { board: Scoreboard; projections?: Projection[] }) {
  const sources = [...new Set(ROWS.map(r => board[r.id]?.source).filter(Boolean))];
  const updated = ROWS.map(r => board[r.id]?.updatedAt).filter(Boolean).sort().at(-1);
  return (
    <section aria-labelledby="scoreboard">
      <h2 id="scoreboard" className="sr-only">Seat count so far</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {ROWS.map(r => {
          const e = board[r.id];
          const call = projections.filter(p => p.chamber === r.id && p.kind === 'called').sort((a, b) => b.at.localeCompare(a.at))[0];
          return (
            <div key={r.id} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-white">{r.label}</span>
                <span className="text-[11px] uppercase tracking-wide text-white/40">{r.sub}</span>
              </div>
              {e ? (
                <>
                  <div className="mt-2 flex items-end justify-between">
                    <div><div className="tnum text-3xl font-extrabold leading-none text-[#60A5FA]">{n(e.d)}</div><div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">Democrats</div></div>
                    <div className="text-right"><div className="tnum text-3xl font-extrabold leading-none text-[#F87171]">{n(e.r)}</div><div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">Republicans</div></div>
                  </div>
                  <Bar e={e} />
                  <div className="mt-2 flex justify-between text-[11px] text-white/50"><span>Others {n(e.other)}</span><span>Not called {n(e.uncalled)}</span></div>
                  {call && <p className="mt-2 text-xs font-semibold text-white/90">Called for <span className={call.party === 'R' ? 'text-[#F87171]' : 'text-[#60A5FA]'}>{call.party === 'R' ? 'Republicans' : 'Democrats'}</span> by {call.by}</p>}
                </>
              ) : (
                <>
                  <div className="mt-2 text-sm text-white/50">Counts appear here as top news sources report them</div>
                  <div className="mt-3 h-2.5 rounded-full bg-white/10" />
                  {call && <p className="mt-2 text-xs font-semibold text-white/90">Called for <span className={call.party === 'R' ? 'text-[#F87171]' : 'text-[#60A5FA]'}>{call.party === 'R' ? 'Republicans' : 'Democrats'}</span> by {call.by}</p>}
                </>
              )}
            </div>
          );
        })}
      </div>
      {sources.length > 0 && (
        <p className="mt-2 text-xs text-white/50">As per {sources.join(' and ')}.{updated && <> Updated <PtTime iso={updated} />.</>}</p>
      )}
    </section>
  );
}
