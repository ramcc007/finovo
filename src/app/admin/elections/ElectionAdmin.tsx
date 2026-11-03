'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, EyeOff, Eye, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';
import { PAGE_PATH, TAG_LABEL, type Chamber, type ElectionMeta, type ElectionUpdate, type ScoreEntry } from '@/lib/election/types';
import { IMAGE_HOSTS, youtubeWatchUrl } from '@/lib/election/media';

const CHAMBERS: { id: Chamber; label: string }[] = [{ id: 'senate', label: 'Senate' }, { id: 'house', label: 'House' }, { id: 'governors', label: 'Governors' }];
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'never');
const card = 'rounded-xl border border-[#E5E7EB] bg-white p-5';
const input = 'h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm focus:border-[#F97316] focus:outline-none';

interface Payload { meta: ElectionMeta | null; updates: ElectionUpdate[]; aiCap: number }

export default function ElectionAdmin() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ headline: '', summary: '', marketImpact: '', mediaType: 'none', mediaUrl: '', mediaCredit: '', mediaCreditUrl: '', mediaAlt: '' });
  const [videoLines, setVideoLines] = useState('');
  const [takeaways, setTakeaways] = useState('');
  const [board, setBoard] = useState<Record<string, { d: string; r: string; other: string; uncalled: string; source: string }>>({});

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/elections', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Failed to load');
      setData(d); setError(null);
      setTakeaways((d.meta?.takeaways ?? []).join('\n'));
      setVideoLines((d.meta?.videos ?? []).map((v: { kind: 'video' | 'live'; id: string; title: string; credit: string }) => `${youtubeWatchUrl(v.kind, v.id)} | ${v.title} | ${v.credit}`).join('\n'));
      const b: typeof board = {};
      for (const c of CHAMBERS) {
        const e: ScoreEntry | undefined = d.meta?.scoreboard?.[c.id];
        b[c.id] = { d: String(e?.d ?? ''), r: String(e?.r ?? ''), other: String(e?.other ?? ''), uncalled: String(e?.uncalled ?? ''), source: e?.source ?? '' };
      }
      setBoard(b);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); } finally { setBusy(false); }
  }, []);
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);

  const act = async (body: Record<string, unknown>, method = 'PATCH', url = '/api/admin/elections') => {
    setBusy(true);
    const r = await adminFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'PATCH' ? JSON.stringify(body) : undefined });
    if (!r.ok) { const d = await r.json().catch(() => ({})); window.alert(d.error ?? 'Could not save.'); setBusy(false); return false; }
    await load();
    return true;
  };

  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!data) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#F97316]" /></div>;
  const { meta, updates, aiCap } = data;
  if (!meta) return <p className="p-8">The election tables are not set up.</p>;
  const pendingKeys = CHAMBERS.filter(c => meta.pendingScoreboard[c.id]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1117]">Election coverage</h1>
          <p className="mt-1 text-sm text-[#4A5568]">Controls for <Link href={PAGE_PATH} target="_blank" className="font-semibold text-[#EA580C] hover:underline">{PAGE_PATH} <ExternalLink size={12} className="inline" /></Link></p>
        </div>
        <button onClick={() => void load()} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-semibold hover:border-[#F97316] disabled:opacity-60">
          <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <section className={card}>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ['Status', meta.coverageEnded ? 'Coverage ended' : 'Live'],
            ['Last run', fmt(meta.lastIngestAt)],
            ['Updates added today', String(meta.itemsToday)],
            ['AI calls today', `${meta.llmCallsToday} of ${aiCap}`],
          ].map(([k, v]) => <div key={k}><div className="text-xs text-[#8A96A8]">{k}</div><div className="font-bold text-[#0D1117]">{v}</div></div>)}
        </div>
        {meta.feedStats.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold text-[#0D1117]">
              Sources: {meta.feedStats.filter(f => f.status === 'ok').length} of {meta.feedStats.length} returning stories in the last run
            </summary>
            <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {meta.feedStats.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex justify-between gap-3 border-b border-[#F1F3F9] py-1 text-xs">
                  <span className="truncate text-[#4A5568]">{f.name}</span>
                  <span className={f.status === 'ok' ? 'text-green-700' : 'text-red-600'}>{f.status === 'ok' ? `${f.relevant} of ${f.total} relevant` : f.status}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {meta.lastError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Last run problem: {meta.lastError}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button disabled={busy} onClick={() => { if (window.confirm(meta.coverageEnded ? 'Resume live coverage?' : 'End coverage? Collecting stops, the badge changes to "Final results" and the page is frozen as an archive.')) void act({ action: 'set_coverage', ended: !meta.coverageEnded }); }}
            className={`inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold ${meta.coverageEnded ? 'border border-[#E5E7EB] bg-white' : 'bg-[#0D1117] text-white'} disabled:opacity-60`}>
            {meta.coverageEnded ? 'Resume coverage' : 'End coverage'}
          </button>
          <span className="text-xs text-[#8A96A8]">Collection runs every 5 minutes from GitHub Actions and stops by itself after the end date.</span>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-[#0D1117]">Seat counts and projections</h2>
            <p className="mt-1 text-sm text-[#4A5568]">Filled in automatically. Only reports from top outlets (AP, Reuters, NPR, BBC, CNN, NBC, CBS, ABC, Politico, The Hill, NYT, Washington Post, Bloomberg and similar) can change them, and counts that look wrong are held back. Nothing here needs approval.</p>
          </div>
          <label className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#0D1117]">
            <input type="checkbox" checked={meta.autoPublish} disabled={busy} onChange={e => void act({ action: 'set_auto', enabled: e.target.checked })} className="h-4 w-4 accent-[#F97316]" />
            Automatic
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {CHAMBERS.map(c => {
            const e = meta.scoreboard[c.id];
            return (
              <div key={c.id} className="rounded-lg bg-[#F4F6FA] p-3">
                <div className="text-xs font-semibold text-[#8A96A8]">{c.label}</div>
                {e ? (
                  <>
                    <div className="mt-1 text-sm font-bold text-[#0D1117]">D {e.d} · R {e.r} · Other {e.other ?? '-'} · Not called {e.uncalled ?? '-'}</div>
                    <div className="text-[11px] text-[#8A96A8]">as per {e.source}, {fmt(e.updatedAt ?? null)}</div>
                  </>
                ) : <div className="mt-1 text-sm text-[#8A96A8]">Waiting for a top source to report counts</div>}
              </div>
            );
          })}
        </div>

        <h3 className="mb-2 mt-5 text-sm font-bold text-[#0D1117]">Projections on the page ({meta.projections.length})</h3>
        {meta.projections.length === 0 ? <p className="text-sm text-[#8A96A8]">None yet. Calls and forecasts appear as soon as a top source reports one.</p> : (
          <ul className="divide-y divide-[#F1F3F9] text-sm">
            {meta.projections.map(p => (
              <li key={`${p.chamber}-${p.kind}-${p.by}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-[#0D1117]">
                  <strong>{p.chamber}</strong>: {p.kind === 'called' ? `called for ${p.party === 'R' ? 'Republicans' : 'Democrats'}` : `${p.party === 'R' ? 'Republicans' : 'Democrats'} ${p.probability}% to win`} <span className="text-[#8A96A8]">by {p.by}, via {p.source}, {fmt(p.at)}</span>
                </span>
                <button disabled={busy} onClick={() => void act({ action: 'remove_projection', chamber: p.chamber, kind: p.kind, by: p.by })} className="h-8 rounded-md border border-[#E5E7EB] px-3 text-xs font-semibold hover:border-red-300 hover:text-red-600 disabled:opacity-60">Remove</button>
              </li>
            ))}
          </ul>
        )}

        {pendingKeys.length > 0 && (
          <div className="mt-5 space-y-2 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-4"><p className="text-xs font-semibold text-[#9A3412]">Held back because the numbers looked wrong. Approve only if they are right.</p>
            {pendingKeys.map(c => {
              const p = meta.pendingScoreboard[c.id]!;
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="min-w-24 font-semibold">{c.label}</span>
                  <span>D {p.d} · R {p.r} · Other {p.other ?? '-'} · Not called {p.uncalled ?? '-'}</span>
                  <span className="text-xs text-[#8A96A8]">as per {p.source}</span>
                  <span className="ml-auto flex gap-2">
                    <button disabled={busy} onClick={() => void act({ action: 'approve_scoreboard', chamber: c.id })} className="h-8 rounded-md bg-[#F97316] px-3 text-xs font-semibold text-white disabled:opacity-60">Approve</button>
                    <button disabled={busy} onClick={() => void act({ action: 'reject_scoreboard', chamber: c.id })} className="h-8 rounded-md border border-[#E5E7EB] bg-white px-3 text-xs font-semibold disabled:opacity-60">Reject</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold text-[#4A5568]">Override a count by hand</summary>
          <div className="mt-3">
        <div className="space-y-3">
          {CHAMBERS.map(c => {
            const b = board[c.id] ?? { d: '', r: '', other: '', uncalled: '', source: '' };
            const set = (k: keyof typeof b, v: string) => setBoard(s => ({ ...s, [c.id]: { ...b, [k]: v } }));
            return (
              <div key={c.id} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[100px_repeat(4,1fr)_1.5fr_auto]">
                <div className="col-span-2 font-semibold sm:col-span-1">{c.label}</div>
                {(['d', 'r', 'other', 'uncalled'] as const).map(k => (
                  <label key={k} className="text-[11px] text-[#8A96A8]">{{ d: 'Democrats', r: 'Republicans', other: 'Others', uncalled: 'Not called' }[k]}
                    <input inputMode="numeric" value={b[k]} onChange={e => set(k, e.target.value.replace(/\D/g, ''))} className={input} /></label>
                ))}
                <label className="col-span-2 text-[11px] text-[#8A96A8] sm:col-span-1">Source<input value={b.source} onChange={e => set('source', e.target.value)} placeholder="AP" className={input} /></label>
                <span className="col-span-2 flex gap-2 sm:col-span-1">
                  <button disabled={busy} onClick={() => void act({ action: 'set_scoreboard', chamber: c.id, d: b.d === '' ? null : Number(b.d), r: b.r === '' ? null : Number(b.r), other: b.other === '' ? null : Number(b.other), uncalled: b.uncalled === '' ? null : Number(b.uncalled), source: b.source })} className="h-9 rounded-md bg-[#0D1117] px-3 text-xs font-semibold text-white disabled:opacity-60">Save</button>
                  <button disabled={busy} onClick={() => void act({ action: 'set_scoreboard', chamber: c.id, clear: true })} className="h-9 rounded-md border border-[#E5E7EB] px-3 text-xs font-semibold disabled:opacity-60">Clear</button>
                </span>
              </div>
            );
          })}
        </div>
          </div>
        </details>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-bold text-[#0D1117]">Watch live videos</h2>
        <p className="mb-3 text-sm text-[#4A5568]">Up to three lines, each: <code>YouTube link | title | credit</code>. A YouTube channel link (youtube.com/channel/UC...) plays that channel&apos;s current live stream. Players load only when a reader presses play.</p>
        <textarea value={videoLines} onChange={e => setVideoLines(e.target.value)} rows={3} placeholder="https://www.youtube.com/watch?v=... | Election night coverage | Channel name" className="w-full rounded-md border border-[#E5E7EB] p-2 font-mono text-xs focus:border-[#F97316] focus:outline-none" />
        <button disabled={busy} onClick={() => void act({ action: 'set_videos', lines: videoLines.split('\n') })} className="mt-2 h-9 rounded-md bg-[#0D1117] px-4 text-sm font-semibold text-white disabled:opacity-60">Save videos</button>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-bold text-[#0D1117]">Where things stand</h2>
        <p className="mb-3 text-sm text-[#4A5568]">One sentence per line, three to five lines. Rewritten automatically only when a top-importance update arrives.</p>
        <textarea value={takeaways} onChange={e => setTakeaways(e.target.value)} rows={5} className="w-full rounded-md border border-[#E5E7EB] p-2 text-sm focus:border-[#F97316] focus:outline-none" />
        <button disabled={busy} onClick={() => void act({ action: 'set_takeaways', takeaways: takeaways.split('\n') })} className="mt-2 h-9 rounded-md bg-[#0D1117] px-4 text-sm font-semibold text-white disabled:opacity-60">Save</button>
      </section>

      <section className={card}>
        <h2 className="mb-3 font-bold text-[#0D1117]">Updates ({updates.length})</h2>
        {updates.length === 0 && <p className="text-sm text-[#4A5568]">Nothing has been collected yet.</p>}
        <ul className="divide-y divide-[#F1F3F9]">
          {updates.map(u => (
            <li key={u.id} className={`py-3 ${u.hidden ? 'opacity-50' : ''}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-[#8A96A8]">{fmt(u.publishedAt)} · {TAG_LABEL[u.tag]} · {u.sources.map(s => s.name).join(', ')}{u.hidden && ' · Hidden'}</div>
                  <div className="font-semibold text-[#0D1117]">{u.headline}</div>
                </div>
                <label className="text-xs text-[#8A96A8]">Importance
                  <select value={u.importance} disabled={busy} onChange={e => void act({ action: 'update_item', id: u.id, importance: Number(e.target.value) })} className="ml-1 h-8 rounded-md border border-[#E5E7EB] bg-white px-1 text-sm">
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <button title="Edit" onClick={() => { setEditing(editing === u.id ? null : u.id); setDraft({ headline: u.headline, summary: u.summary, marketImpact: u.marketImpact ?? '', mediaType: u.media?.type ?? 'none', mediaUrl: u.media?.url ?? '', mediaCredit: u.media?.credit ?? '', mediaCreditUrl: u.media?.creditUrl ?? '', mediaAlt: u.media?.alt ?? '' }); }} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB]"><Pencil size={14} /></button>
                <button title={u.hidden ? 'Show on page' : 'Hide from page'} disabled={busy} onClick={() => void act({ action: 'update_item', id: u.id, hidden: !u.hidden })} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB]">{u.hidden ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                <button title="Delete" disabled={busy} onClick={() => { if (window.confirm('Delete this update permanently?')) void act({}, 'DELETE', `/api/admin/elections?id=${u.id}`); }} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600"><Trash2 size={14} /></button>
              </div>
              {editing === u.id && (
                <div className="mt-3 space-y-2 rounded-lg bg-[#F9FAFB] p-3">
                  <input value={draft.headline} onChange={e => setDraft({ ...draft, headline: e.target.value })} className={input} aria-label="Headline" />
                  <textarea value={draft.summary} onChange={e => setDraft({ ...draft, summary: e.target.value })} rows={3} className="w-full rounded-md border border-[#E5E7EB] p-2 text-sm" aria-label="Summary" />
                  <textarea value={draft.marketImpact} onChange={e => setDraft({ ...draft, marketImpact: e.target.value })} rows={2} placeholder="Market impact (leave empty to remove)" className="w-full rounded-md border border-[#E5E7EB] p-2 text-sm" aria-label="Market impact" />
                  <div className="rounded-md border border-[#E5E7EB] bg-white p-3">
                    <div className="mb-2 text-xs font-semibold text-[#4A5568]">Picture or video (optional, always credited, never stored by Scripwise)</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select value={draft.mediaType} onChange={e => setDraft({ ...draft, mediaType: e.target.value })} className={input} aria-label="Media type">
                        <option value="none">No media</option><option value="image">Picture</option><option value="video">YouTube video</option>
                      </select>
                      <input value={draft.mediaUrl} onChange={e => setDraft({ ...draft, mediaUrl: e.target.value })} placeholder={draft.mediaType === 'video' ? 'YouTube video link' : 'Image link'} className={input} aria-label="Media link" />
                      <input value={draft.mediaCredit} onChange={e => setDraft({ ...draft, mediaCredit: e.target.value })} placeholder="Credit, for example: Name / Wikimedia Commons" className={input} aria-label="Credit" />
                      <input value={draft.mediaCreditUrl} onChange={e => setDraft({ ...draft, mediaCreditUrl: e.target.value })} placeholder="Link to the credit or licence page (optional)" className={input} aria-label="Credit link" />
                      {draft.mediaType === 'image' && <input value={draft.mediaAlt} onChange={e => setDraft({ ...draft, mediaAlt: e.target.value })} placeholder="Describe the picture (for screen readers)" className={`${input} sm:col-span-2`} aria-label="Picture description" />}
                    </div>
                    {draft.mediaType === 'image' && <p className="mt-2 text-[11px] text-[#8A96A8]">Pictures can come from: {IMAGE_HOSTS.join(', ')}.</p>}
                  </div>
                  <button disabled={busy} onClick={async () => { const { mediaType, mediaUrl, mediaCredit, mediaCreditUrl, mediaAlt, ...rest } = draft; if (await act({ action: 'update_item', id: u.id, ...rest, media: { type: mediaType, url: mediaUrl, credit: mediaCredit, creditUrl: mediaCreditUrl, alt: mediaAlt } })) setEditing(null); }} className="h-9 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white disabled:opacity-60">Save changes</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
