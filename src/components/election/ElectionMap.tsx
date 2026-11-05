'use client';

import { useMemo, useState } from 'react';
import { US_STATES } from '@/lib/election/usMap';
import type { ScoreEntry } from '@/lib/election/types';
import { RACE_STATES, raceKey, tally, type MapChamber, type Party, type RaceResult } from '@/lib/election/raceMap';
import PtTime from './PtTime';

const PARTY_NAME: Record<Party, string> = { D: 'Democrat', R: 'Republican', I: 'Independent' };
const SOLID: Record<Party, string> = { D: '#2563EB', R: '#DC2626', I: '#7C3AED' };
const LIGHT: Record<Party, string> = { D: '#BFDBFE', R: '#FECACA', I: '#DDD6FE' };
const LABEL: Record<MapChamber, string> = { senate: 'Senate', governor: 'Governors' };

// Wider than the raw map so there is room on the right for the small Northeast states, drawn as labelled pills.
const VIEWBOX = '-12 0 1070 725';
const PILLS = ['VT', 'NH', 'MA', 'RI', 'CT', 'NJ', 'DE', 'MD'];
const PILL_X = 1018, PILL_W = 58, PILL_H = 26, PILL_Y0 = 150, PILL_STEP = 36;
// Alaska and Hawaii are drawn larger than the source map's insets: scale about a point, then shift.
const INSETS: Record<string, { s: number; ox: number; oy: number; dx: number; dy: number }> = {
  AK: { s: 1.15, ox: 102, oy: 593, dx: 30, dy: 85 },
  HI: { s: 1.35, ox: 241, oy: 611, dx: 95, dy: 105 },
};
const inset = (code: string) => { const i = INSETS[code]; return i ? `translate(${i.ox * (1 - i.s) + i.dx} ${i.oy * (1 - i.s) + i.dy}) scale(${i.s})` : undefined; };
const place = (code: string, x: number, y: number) => { const i = INSETS[code]; return i ? { x: i.ox + (x - i.ox) * i.s + i.dx, y: i.oy + (y - i.oy) * i.s + i.dy } : { x, y }; };

function fillFor(inRace: boolean, r?: RaceResult): string {
  if (!inRace) return 'url(#em-hatch)';
  if (r?.party && r.status === 'called') return SOLID[r.party];
  if (r?.party && r.status === 'leading') return LIGHT[r.party];
  return '#FFFFFF'; // election with no result yet: white, outlined in the path's stroke
}

function describe(chamber: MapChamber, name: string, inRace: boolean, r?: RaceResult): string {
  const what = chamber === 'senate' ? 'Senate' : 'governor';
  if (!inRace) return `${name}: no ${what} election this year`;
  if (r?.party && r.status === 'called') return `${name} ${what} race: ${PARTY_NAME[r.party]} win called`;
  if (r?.party && r.status === 'leading') return `${name} ${what} race: ${PARTY_NAME[r.party]} leading, not yet called`;
  if (r?.conflict) return `${name} ${what} race: outlets disagree, not shown yet`;
  return `${name} ${what} race: no result reported yet`;
}

/** Live Senate and governor map. Calls come from reports by top news outlets; the page refreshes itself via LiveRefresh. */
export default function ElectionMap({ races, updatedAt, board, ended = false, initial = 'senate' }: { races: RaceResult[]; updatedAt: string | null; ended?: boolean; board?: Partial<Record<'senate' | 'governors', ScoreEntry>>; initial?: MapChamber }) {
  const [chamber, setChamber] = useState<MapChamber>(initial);
  const [picked, setPicked] = useState<string | null>(null);

  const results = useMemo(() => new Map(races.map(r => [raceKey(r.chamber, r.state), r])), [races]);
  const t = tally(chamber, results);
  const names = useMemo(() => Object.fromEntries(US_STATES.map(s => [s.code, s.name])), []);
  const sel = picked ? { code: picked, inRace: RACE_STATES[chamber].includes(picked), r: results.get(raceKey(chamber, picked)) } : null;
  // Full-chamber counts (including seats not up this year) when a top outlet has reported them; otherwise just the races on the map.
  const sb = board?.[chamber === 'senate' ? 'senate' : 'governors'];
  const sbCalled = sb ? (sb.d ?? 0) + (sb.r ?? 0) + (sb.other ?? 0) : 0;
  const full = !!sb && sbCalled > 0;
  const total = full ? (chamber === 'senate' ? 100 : 50) : t.total;
  const nd = full ? sb!.d ?? 0 : t.d, nr = full ? sb!.r ?? 0 : t.r, ni = full ? sb!.other ?? 0 : t.i;
  const undecided = total - nd - nr - ni;
  const pct = (n: number) => `${(n / total) * 100}%`;
  const majority = full && chamber === 'senate' ? 51 : null;

  const lists = (c: MapChamber) => {
    const tl = RACE_STATES[c].map(code => ({ code, r: results.get(raceKey(c, code)) }));
    const pick = (party: Party, status: 'called' | 'leading') => tl.filter(x => x.r?.party === party && x.r.status === status).map(x => names[x.code]);
    return { dCalled: pick('D', 'called'), rCalled: pick('R', 'called'), iCalled: pick('I', 'called'), leading: [...pick('D', 'leading').map(n => `${n} (D)`), ...pick('R', 'leading').map(n => `${n} (R)`), ...pick('I', 'leading').map(n => `${n} (I)`)] };
  };

  return (
    <section aria-labelledby="em-h" className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#E5E7EB] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="em-h" className="text-2xl font-extrabold tracking-tight text-[#0D1117]">{ended ? 'Map: Senate and governor races' : 'Live map: Senate and governor races'}</h2>
          {ended ? (
            <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-green-700 ring-1 ring-green-200">Final</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-red-600 ring-1 ring-red-200">
              <span className="relative flex h-2 w-2" aria-hidden><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" /></span>
              Live
            </span>
          )}
        </div>
        <div role="tablist" aria-label="Choose a chamber" className="inline-flex rounded-full bg-[#EEF1F7] p-1">
          {(['senate', 'governor'] as MapChamber[]).map(c => (
            <button key={c} type="button" role="tab" aria-selected={chamber === c} onClick={() => { setChamber(c); setPicked(null); }}
              className={`min-h-9 rounded-full px-4 text-sm font-bold transition-colors ${chamber === c ? 'bg-[#0D1117] text-white' : 'text-[#4A5568] hover:text-[#0D1117]'}`}>
              {LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-sm text-[#4A5568]">
        {full ? <>Seat counts from <strong>{sb!.source}</strong>; state calls from top news outlets.</> : <>From top news outlets: AP, Reuters, NPR, BBC, CNN and others.</>}
      </p>
      <p className="mt-1 text-xs text-[#8A96A8]">
        {chamber === 'senate' ? '35 of 100 Senate seats are up this year.' : '36 of 50 governorships are up this year.'}{' '}
        {updatedAt ? <>{ended ? 'Last updated' : 'Updated'} <PtTime iso={updatedAt} />.</> : 'Waiting for the first result.'}{ended ? ' This map is no longer being updated.' : ' Refreshes about every 10 minutes.'}
      </p>

      {/* Bar: Democrats on the left, Republicans on the right, undecided in the middle */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-end justify-between">
          <div><span className="text-3xl font-extrabold leading-none text-[#2563EB]">{nd}</span><span className="ml-1.5 text-xs font-bold uppercase tracking-wide text-[#2563EB]">Dem</span>{!full && t.leadingD > 0 && <span className="ml-2 text-xs text-[#8A96A8]">+{t.leadingD} leading</span>}</div>
          <div className="text-right">{!full && t.leadingR > 0 && <span className="mr-2 text-xs text-[#8A96A8]">+{t.leadingR} leading</span>}<span className="mr-1.5 text-xs font-bold uppercase tracking-wide text-[#DC2626]">GOP</span><span className="text-3xl font-extrabold leading-none text-[#DC2626]">{nr}</span></div>
        </div>
        <div className={`relative ${majority ? 'pt-5' : ''}`}>
          {majority && <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-[#4A5568]" style={{ left: pct(majority) }}>{majority} for majority</span>}
          <div className="flex h-3 overflow-hidden rounded-full bg-[#E5E7EB]" role="img"
            aria-label={`${LABEL[chamber]}: Democrats ${nd}, Republicans ${nr}${ni ? `, others ${ni}` : ''}, ${undecided} not yet called, out of ${total}${full ? ' seats' : ' races'}`}>
            <div className="bg-[#2563EB] transition-all" style={{ width: pct(nd) }} />
            {ni > 0 && <div className="bg-[#7C3AED]" style={{ width: pct(ni) }} />}
            <div className="flex-1" />
            <div className="bg-[#DC2626] transition-all" style={{ width: pct(nr) }} />
          </div>
          {majority && <span className="pointer-events-none absolute bottom-[-3px] top-[18px] w-0.5 -translate-x-1/2 bg-[#0D1117]" style={{ left: pct(majority) }} aria-hidden />}
        </div>
        <p className="mt-1.5 text-center text-xs text-[#8A96A8]">
          {full ? `${undecided} of ${total} seats not yet called${ni > 0 ? ` · ${ni} independent or other` : ''} · ` : `${undecided} of ${total} races not yet called${ni > 0 ? ` · ${ni} independent` : ''} · `}
          {t.d + t.r + t.i} of {t.total} races on the map called
        </p>
      </div>

      <div className="mt-4">
        <svg viewBox={VIEWBOX} className="h-auto w-full" role="group" aria-label={`Map of ${LABEL[chamber]} races`}>
          <defs>
            <pattern id="em-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="7" height="7" fill="#F3F4F6" /><line x1="0" y1="0" x2="0" y2="7" stroke="#D1D5DB" strokeWidth="2" />
            </pattern>
          </defs>
          {US_STATES.map(s => {
            const inRace = RACE_STATES[chamber].includes(s.code);
            const r = results.get(raceKey(chamber, s.code));
            const isSel = picked === s.code;
            const unsettled = inRace && !r?.party;
            const toggle = () => setPicked(p => (p === s.code ? null : s.code));
            return (
              <path key={s.code} d={s.d} transform={inset(s.code)} fill={fillFor(inRace, r)} stroke={isSel ? '#0D1117' : unsettled ? '#94A3B8' : '#FFFFFF'} strokeWidth={isSel ? 2.2 : unsettled ? 1.4 : 1.2} strokeLinejoin="round"
                className={inRace ? 'cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80' : 'outline-none'}
                tabIndex={inRace ? 0 : undefined} role={inRace ? 'button' : undefined} aria-label={describe(chamber, s.name, inRace, r)}
                onClick={toggle} onKeyDown={e => { if (inRace && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } }}>
                <title>{describe(chamber, s.name, inRace, r)}</title>
              </path>
            );
          })}
          {US_STATES.filter(s => s.w > 34 && s.h > 22 && !PILLS.includes(s.code)).map(s => {
            const inRace = RACE_STATES[chamber].includes(s.code);
            const r = results.get(raceKey(chamber, s.code));
            const dark = inRace && r?.party && r.status === 'called';
            const pos = place(s.code, s.cx, s.cy);
            return <text key={s.code} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fill={dark ? '#FFFFFF' : inRace ? '#374151' : '#9CA3AF'} pointerEvents="none" aria-hidden>{s.code}</text>;
          })}
          {/* Small Northeast states: a pill on the right with a leader line, as on Google's map */}
          {PILLS.map((code, i) => {
            const s = US_STATES.find(x => x.code === code);
            if (!s) return null;
            const inRace = RACE_STATES[chamber].includes(code);
            const r = results.get(raceKey(chamber, code));
            const y = PILL_Y0 + i * PILL_STEP;
            const solid = inRace && r?.party && r.status === 'called';
            const isSel = picked === code;
            const toggle = () => setPicked(p => (p === code ? null : code));
            return (
              <g key={code}>
                <line x1={s.cx} y1={s.cy} x2={PILL_X - PILL_W / 2} y2={y} stroke="#94A3B8" strokeWidth="1" />
                <circle cx={s.cx} cy={s.cy} r="2.4" fill="#475569" />
                <g tabIndex={inRace ? 0 : undefined} role={inRace ? 'button' : undefined} aria-label={describe(chamber, s.name, inRace, r)} className={inRace ? 'cursor-pointer outline-none hover:opacity-80 focus-visible:opacity-80' : 'outline-none'}
                  onClick={inRace ? toggle : undefined} onKeyDown={e => { if (inRace && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } }}>
                  <rect x={PILL_X - PILL_W / 2} y={y - PILL_H / 2} width={PILL_W} height={PILL_H} rx={PILL_H / 2} fill={fillFor(inRace, r)} stroke={isSel ? '#0D1117' : inRace && !r?.party ? '#94A3B8' : '#E5E7EB'} strokeWidth={isSel ? 2.2 : 1.4} />
                  <text x={PILL_X} y={y} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fill={solid ? '#FFFFFF' : inRace ? '#374151' : '#9CA3AF'} pointerEvents="none" aria-hidden>{code}</text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#4A5568]">
        {[
          { c: '#2563EB', t: 'Democrat won' }, { c: '#DC2626', t: 'Republican won' }, { c: '#BFDBFE', t: 'Leading (not yet confirmed)', b: '#93C5FD' },
          { c: '#FFFFFF', t: 'No result yet', b: '#D1D5DB' }, { c: 'url(#em-hatch-key)', t: 'No election' },
        ].map(i => (
          <li key={i.t} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: i.c.startsWith('url') ? 'repeating-linear-gradient(45deg,#F3F4F6 0 3px,#D1D5DB 3px 5px)' : i.c, boxShadow: i.b ? `inset 0 0 0 1px ${i.b}` : undefined }} aria-hidden />{i.t}
          </li>
        ))}
      </ul>

      <div className="mt-4 min-h-[3.5rem] rounded-xl bg-[#F7F8FB] p-3.5 text-sm text-[#1F2937]" aria-live="polite">
        {sel ? (
          <>
            <p className="font-bold text-[#0D1117]">{names[sel.code]}</p>
            <p className="mt-0.5">{describe(chamber, names[sel.code], sel.inRace, sel.r).split(': ')[1] ?? describe(chamber, names[sel.code], sel.inRace, sel.r)}.</p>
            {sel.r?.overridden && <p className="mt-1 text-xs text-[#8A96A8]">Set by the Scripwise desk after checking the reports.</p>}
            {sel.r && sel.r.sources.length > 0 && (
              <p className="mt-1.5 text-xs text-[#4A5568]">
                Reported by:{' '}
                {sel.r.sources.map((s, i) => (
                  <span key={s.name}>{i > 0 && ', '}<a href={s.url} target="_blank" rel="noopener nofollow" className="font-semibold text-[#2563EB] underline-offset-2 hover:underline">{s.name}</a> ({s.status === 'called' ? 'called' : 'leading'}, {PARTY_NAME[s.party]})</span>
                ))}
              </p>
            )}
          </>
        ) : <p className="text-[#8A96A8]">Select a state to see which news outlets reported its result.</p>}
      </div>

      {(['senate', 'governor'] as MapChamber[]).map(c => {
        const l = lists(c);
        const any = l.dCalled.length + l.rCalled.length + l.iCalled.length + l.leading.length > 0;
        return (
          <div key={c} hidden={c !== chamber} className="mt-4 text-sm leading-relaxed text-[#1F2937]">
            <h3 className="text-sm font-bold text-[#0D1117]">{LABEL[c]} results so far</h3>
            {any ? (
              <ul className="mt-1.5 space-y-1">
                {l.dCalled.length > 0 && <li><strong className="text-[#2563EB]">Democrats ({l.dCalled.length}):</strong> {l.dCalled.join(', ')}.</li>}
                {l.rCalled.length > 0 && <li><strong className="text-[#DC2626]">Republicans ({l.rCalled.length}):</strong> {l.rCalled.join(', ')}.</li>}
                {l.iCalled.length > 0 && <li><strong className="text-[#7C3AED]">Independents ({l.iCalled.length}):</strong> {l.iCalled.join(', ')}.</li>}
                {l.leading.length > 0 && <li><strong>Leading, not yet called:</strong> {l.leading.join(', ')}.</li>}
              </ul>
            ) : <p className="mt-1.5 text-[#4A5568]">No {c === 'senate' ? 'Senate' : 'governor'} race has been called yet.</p>}
          </div>
        );
      })}

      <p className="mt-4 border-t border-[#EEF1F7] pt-3 text-xs leading-relaxed text-[#8A96A8]">
        Source: calls as reported by top news outlets such as AP, Reuters, NPR, BBC and CNN, gathered automatically every few minutes. A state turns solid when AP, Reuters or Decision Desk HQ calls it, or when two different outlets report the same winner. Any other single outlet shows a lighter shade, and outlets that disagree are held back. This is not an official result. Scripwise does not call races itself.
      </p>
    </section>
  );
}
