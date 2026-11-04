'use client';

import { useState } from 'react';
import { RACE_STATES, raceKey, resolveRaces, type MapChamber, type Overrides, type RaceReport } from '@/lib/election/raceMap';
import { US_STATES } from '@/lib/election/usMap';

const names = Object.fromEntries(US_STATES.map(s => [s.code, s.name]));
const sel = 'h-9 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm focus:border-[#F97316] focus:outline-none';
const PARTY = { D: 'Democrat', R: 'Republican', I: 'Independent' } as const;
const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Shows what each top outlet reported for every Senate and governor race, and lets a person correct a state on the map. */
export default function MapCallsAdmin({ reports, overrides, busy, act }: {
  reports: RaceReport[]; overrides: Overrides; busy: boolean; act: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const [chamber, setChamber] = useState<MapChamber>('senate');
  const [state, setState] = useState('');
  const [value, setValue] = useState('D:called');
  const results = resolveRaces(reports, overrides);
  const rows = RACE_STATES[chamber].map(code => ({ code, r: results.get(raceKey(chamber, code)) })).filter(x => x.r);
  const overridden = Object.entries(overrides);

  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-white p-5">
      <h2 className="text-lg font-bold text-[#0D1117]">Map calls</h2>
      <p className="mt-1 text-sm text-[#4A5568]">Collected from top outlets. A state turns solid when two different outlets agree. Use the form to set a state yourself if the reports are wrong or still undecided.</p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-[11px] text-[#8A96A8]">Chamber<br />
          <select value={chamber} onChange={e => { setChamber(e.target.value as MapChamber); setState(''); }} className={sel}><option value="senate">Senate</option><option value="governor">Governor</option></select></label>
        <label className="text-[11px] text-[#8A96A8]">State<br />
          <select value={state} onChange={e => setState(e.target.value)} className={sel}><option value="">Choose…</option>{RACE_STATES[chamber].map(c => <option key={c} value={c}>{names[c]}</option>)}</select></label>
        <label className="text-[11px] text-[#8A96A8]">Show as<br />
          <select value={value} onChange={e => setValue(e.target.value)} className={sel}>
            {(['D', 'R', 'I'] as const).flatMap(p => [<option key={`${p}c`} value={`${p}:called`}>{PARTY[p]} won (solid)</option>, <option key={`${p}l`} value={`${p}:leading`}>{PARTY[p]} leading (light)</option>])}
            <option value="none:none">Hide / no result</option>
          </select></label>
        <button disabled={busy || !state} onClick={() => { const [p, s] = value.split(':'); void act({ action: 'set_race_override', chamber, state, party: p === 'none' ? null : p, status: s }); }}
          className="h-9 rounded-md bg-[#0D1117] px-3 text-xs font-semibold text-white disabled:opacity-60">Set</button>
      </div>

      {overridden.length > 0 && (
        <div className="mt-4 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-3 text-sm">
          <p className="mb-1 text-xs font-semibold text-[#9A3412]">Set by hand ({overridden.length}). These ignore the outlets until cleared.</p>
          <ul className="space-y-1">
            {overridden.map(([k, o]) => {
              const [c, s] = k.split(':');
              return (
                <li key={k} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{names[s]} {c}: {o.status === 'none' ? 'hidden' : `${o.party ? PARTY[o.party] : ''} ${o.status === 'called' ? 'won' : 'leading'}`}</span>
                  <button disabled={busy} onClick={() => void act({ action: 'clear_race_override', chamber: c, state: s })} className="h-7 rounded-md border border-[#E5E7EB] bg-white px-2 text-xs font-semibold hover:border-red-300 hover:text-red-600 disabled:opacity-60">Clear</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <h3 className="mb-1 mt-5 text-sm font-bold text-[#0D1117]">Reports received ({rows.length} {chamber} races)</h3>
      {rows.length === 0 ? <p className="text-sm text-[#8A96A8]">None yet. Calls appear when a top outlet reports one.</p> : (
        <ul className="divide-y divide-[#F1F3F9] text-sm">
          {rows.map(({ code, r }) => (
            <li key={code} className="py-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <strong className="text-[#0D1117]">{names[code]}</strong>
                <span className={r!.status === 'called' ? 'font-semibold text-green-700' : r!.conflict ? 'font-semibold text-red-600' : 'text-[#4A5568]'}>
                  {r!.conflict ? 'Outlets disagree (hidden)' : r!.status === 'none' ? 'Hidden' : `${r!.party ? PARTY[r!.party] : ''} ${r!.status === 'called' ? 'won' : 'leading'}`}{r!.overridden ? ' (set by hand)' : ''}
                </span>
              </div>
              <ul className="mt-0.5 text-xs text-[#8A96A8]">
                {r!.sources.map(s => <li key={s.name}>{s.name}: {PARTY[s.party]} {s.status}, {fmt(s.at)}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
