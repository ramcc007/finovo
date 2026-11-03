'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, Pencil, Trash2, Upload } from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';
import { initials, type Author } from '@/lib/authors';

type Row = Author & { posts: number };
interface Draft { role: string; bio: string; location: string; beats: string; x: string; linkedin: string; website: string }
const card = 'rounded-xl border border-[#E5E7EB] bg-white p-5';
const input = 'h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm focus:border-[#F97316] focus:outline-none';
const label = 'mb-1 block text-xs font-semibold text-[#4A5568]';

export default function AuthorsAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ role: '', bio: '', location: '', beats: '', x: '', linkedin: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await adminFetch('/api/admin/authors', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Failed to load');
      setRows(d.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
  }, []);
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);

  const edit = (a: Row) => {
    setEditing(a.id); setMsg(null);
    setDraft({ role: a.role, bio: a.bio, location: a.location, beats: a.beats.join(', '), x: a.links.x ?? '', linkedin: a.links.linkedin ?? '', website: a.links.website ?? '' });
  };

  const save = async (id: string) => {
    setBusy(true); setMsg(null);
    const body = { id, role: draft.role, bio: draft.bio, location: draft.location, beats: draft.beats.split(',').map(s => s.trim()).filter(Boolean), links: { x: draft.x, linkedin: draft.linkedin, website: draft.website } };
    const r = await adminFetch('/api/admin/authors', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(d.error ?? 'Could not save.'); return; }
    setEditing(null); await load();
  };

  const upload = async (id: string, file: File) => {
    setBusy(true); setMsg(null);
    const fd = new FormData(); fd.append('id', id); fd.append('file', file);
    const r = await adminFetch('/api/admin/authors/photo', { method: 'POST', body: fd });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(d.error ?? 'Upload failed.'); return; }
    await load();
  };

  const removePhoto = async (id: string) => {
    if (!window.confirm('Remove this photo?')) return;
    setBusy(true);
    await adminFetch(`/api/admin/authors/photo?id=${id}`, { method: 'DELETE' });
    setBusy(false); await load();
  };

  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!rows) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#F97316]" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 md:px-6 md:py-10">
      <div>
        <h1 className="text-2xl font-bold text-[#0D1117]">Authors</h1>
        <p className="mt-1 text-sm text-[#4A5568]">One entry per byline used on the blog. Names come from the posts themselves; set the byline in the post editor. Each author has a page at /blog/author/&lt;name&gt;.</p>
      </div>
      {msg && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>}

      {rows.map(a => (
        <section key={a.id} className={card}>
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative">
              {a.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-black/10" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF7ED] text-lg font-bold text-[#C2410C]">{initials(a.name)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="font-bold text-[#0D1117]">{a.name}</h2>
                <span className="text-xs text-[#8A96A8]">{a.posts} published post{a.posts === 1 ? '' : 's'}</span>
                <Link href={`/blog/author/${a.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-[#EA580C] hover:underline">View page <ExternalLink size={11} /></Link>
              </div>
              <p className="mt-0.5 text-sm text-[#4A5568]">{[a.role, a.location].filter(Boolean).join(' · ') || <span className="text-[#8A96A8]">No role or location yet</span>}</p>
              {a.bio ? <p className="mt-1 line-clamp-2 text-sm text-[#4A5568]">{a.bio}</p> : <p className="mt-1 text-sm text-[#8A96A8]">No bio yet. The author page shows only the name and articles until one is added.</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => (editing === a.id ? setEditing(null) : edit(a))} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold hover:border-[#F97316]"><Pencil size={14} /> Edit</button>
            </div>
          </div>

          {editing === a.id && (
            <div className="mt-4 space-y-3 rounded-lg bg-[#F9FAFB] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void upload(a.id, f); e.target.value = ''; }} />
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm font-semibold hover:border-[#F97316] disabled:opacity-60"><Upload size={14} /> {a.photoUrl ? 'Replace photo' : 'Upload photo'}</button>
                {a.photoUrl && <button type="button" disabled={busy} onClick={() => void removePhoto(a.id)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 size={14} /> Remove photo</button>}
                <span className="text-xs text-[#8A96A8]">Square JPG, PNG or WebP, under 3 MB.</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className={label}>Role or title</label><input value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} placeholder="Markets writer" className={input} /></div>
                <div><label className={label}>Location</label><input value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} placeholder="Mumbai, India" className={input} /></div>
              </div>
              <div><label className={label}>Bio (2 to 4 sentences)</label><textarea value={draft.bio} onChange={e => setDraft({ ...draft, bio: e.target.value })} rows={4} className="w-full rounded-md border border-[#E5E7EB] p-3 text-sm focus:border-[#F97316] focus:outline-none" /></div>
              <div><label className={label}>Beats (comma separated, up to 6)</label><input value={draft.beats} onChange={e => setDraft({ ...draft, beats: e.target.value })} placeholder="Mutual funds, SIPs, Tax" className={input} /></div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><label className={label}>X (Twitter)</label><input value={draft.x} onChange={e => setDraft({ ...draft, x: e.target.value })} placeholder="https://x.com/..." className={input} /></div>
                <div><label className={label}>LinkedIn</label><input value={draft.linkedin} onChange={e => setDraft({ ...draft, linkedin: e.target.value })} placeholder="https://www.linkedin.com/in/..." className={input} /></div>
                <div><label className={label}>Website</label><input value={draft.website} onChange={e => setDraft({ ...draft, website: e.target.value })} placeholder="https://..." className={input} /></div>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => void save(a.id)} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-60">{busy && <Loader2 size={14} className="animate-spin" />} Save</button>
                <button type="button" onClick={() => setEditing(null)} className="h-10 rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold">Cancel</button>
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
