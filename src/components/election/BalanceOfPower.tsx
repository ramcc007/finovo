import type { Scoreboard, ScoreEntry } from '@/lib/election/types';

interface Seg { v: number; cls: string; label: string }

function Strip({ segs, total, marker, markerLabel }: { segs: Seg[]; total: number; marker: number; markerLabel: string }) {
  return (
    <div className="relative pt-6">
      <div className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-[#0D1117]" style={{ left: `${(marker / total) * 100}%` }}>{markerLabel}</div>
      <div className="flex h-7 overflow-hidden rounded-lg bg-[#EEF1F7]" role="img" aria-label={segs.map(s => `${s.label} ${s.v}`).join(', ')}>
        {segs.filter(s => s.v > 0).map(s => <div key={s.label} className={s.cls} style={{ width: `${(s.v / total) * 100}%` }} title={`${s.label}: ${s.v}`} />)}
      </div>
      <div className="pointer-events-none absolute bottom-0 top-5 w-0.5 -translate-x-1/2 bg-[#0D1117]" style={{ left: `${(marker / total) * 100}%` }} aria-hidden />
    </div>
  );
}

const sumCalled = (e: ScoreEntry) => (e.d ?? 0) + (e.r ?? 0) + (e.other ?? 0);

function Legend({ items }: { items: { cls: string; text: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#4A5568]">
      {items.map(i => <li key={i.text} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${i.cls}`} aria-hidden />{i.text}</li>)}
    </ul>
  );
}

/** Two bars showing who controls each chamber: live counts when top sources have reported them, otherwise the starting position. */
export default function BalanceOfPower({ board }: { board: Scoreboard }) {
  const sen = board.senate, hou = board.house;
  const senCalled = sen ? sumCalled(sen) : 0, houCalled = hou ? sumCalled(hou) : 0;
  return (
    <section aria-labelledby="bop" className="rounded-2xl bg-white p-5 ring-1 ring-[#E5E7EB] sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <h2 id="bop" className="text-2xl font-extrabold tracking-tight text-[#0D1117]">Balance of power</h2>
        <p className="text-xs text-[#8A96A8]">435 House seats · 35 of 100 Senate seats · 36 governor races</p>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="flex items-baseline justify-between"><h3 className="font-bold text-[#0D1117]">Senate</h3><span className="text-xs text-[#8A96A8]">51 of 100 needed</span></div>
          {sen && senCalled > 0 ? (
            <>
              <Strip total={100} marker={51} markerLabel="51" segs={[
                { v: sen.d ?? 0, cls: 'bg-[#3B82F6]', label: 'Democrats' }, { v: sen.other ?? 0, cls: 'bg-[#A78BFA]', label: 'Others' },
                { v: Math.max(0, 100 - senCalled - (sen.r ?? 0)), cls: 'bg-[#D1D5DB]', label: 'Not called' }, { v: sen.r ?? 0, cls: 'bg-[#EF4444]', label: 'Republicans' },
              ]} />
              <Legend items={[{ cls: 'bg-[#3B82F6]', text: `Democrats ${sen.d ?? '-'}` }, { cls: 'bg-[#A78BFA]', text: `Others ${sen.other ?? '-'}` }, { cls: 'bg-[#EF4444]', text: `Republicans ${sen.r ?? '-'}` }]} />
              <p className="mt-2 text-xs text-[#8A96A8]">As per {sen.source}.</p>
            </>
          ) : (
            <>
              <Strip total={100} marker={51} markerLabel="51" segs={[{ v: 47, cls: 'bg-[#3B82F6]', label: 'Democrats and allied independents (before the election)' }, { v: 53, cls: 'bg-[#EF4444]', label: 'Republicans (before the election)' }]} />
              <Legend items={[{ cls: 'bg-[#3B82F6]', text: 'Democrats and allied independents 47' }, { cls: 'bg-[#EF4444]', text: 'Republicans 53' }]} />
              <p className="mt-2 text-xs text-[#8A96A8]">Position before the election, as per Al Jazeera. The bar will show seats won as top news sources report them.</p>
            </>
          )}
        </div>
        <div>
          <div className="flex items-baseline justify-between"><h3 className="font-bold text-[#0D1117]">House of Representatives</h3><span className="text-xs text-[#8A96A8]">218 of 435 needed</span></div>
          {hou && houCalled > 0 ? (
            <>
              <Strip total={435} marker={218} markerLabel="218" segs={[
                { v: hou.d ?? 0, cls: 'bg-[#3B82F6]', label: 'Democrats' }, { v: hou.other ?? 0, cls: 'bg-[#A78BFA]', label: 'Others' },
                { v: Math.max(0, 435 - houCalled - (hou.r ?? 0)), cls: 'bg-[#D1D5DB]', label: 'Not called' }, { v: hou.r ?? 0, cls: 'bg-[#EF4444]', label: 'Republicans' },
              ]} />
              <Legend items={[{ cls: 'bg-[#3B82F6]', text: `Democrats ${hou.d ?? '-'}` }, { cls: 'bg-[#A78BFA]', text: `Others ${hou.other ?? '-'}` }, { cls: 'bg-[#EF4444]', text: `Republicans ${hou.r ?? '-'}` }]} />
              <p className="mt-2 text-xs text-[#8A96A8]">As per {hou.source}.</p>
            </>
          ) : (
            <>
              <Strip total={435} marker={218} markerLabel="218" segs={[{ v: 435, cls: 'bg-[#E5E7EB]', label: 'No seats called yet' }]} />
              <Legend items={[{ cls: 'bg-[#E5E7EB]', text: 'No seats called yet' }]} />
              <p className="mt-2 text-xs text-[#8A96A8]">As per NBC News, Republicans are seeking to protect a narrow majority and Democrats need a net gain of 3 seats to flip the House.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
