'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2, PenSquare, Pencil, Trash2, ExternalLink, Eye, Search, X, CalendarClock, CheckCircle2, FileText, Layers, Send,
} from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';
import { formatDate } from '@/lib/blog';
import { cn } from '@/lib/utils';

interface Row {
  id: string; slug: string; title: string; category: string;
  status: 'draft' | 'published'; published_at: string | null; updated_at: string; created_at: string;
}

export interface ContentListConfig {
  heading: string;
  noun: string; // singular, e.g. "post"
  apiPath: string; // list (GET) and `${apiPath}/${id}` (DELETE)
  publicPath: string; // e.g. "/blog"
  newHref?: string;
  newLabel?: string;
  editHref?: (id: string) => string;
  searchPlaceholder: string;
  titleLabel?: string; // first column header, default "Title"
  // Order for the All / Published / Drafts tabs when no sort is chosen.
  defaultSort: 'date_desc' | 'title';
  mapRow?: (raw: Record<string, unknown>) => Row;
}
type Kind = 'published' | 'scheduled' | 'draft';
type Tab = 'all' | Kind;
type Sort = 'date_desc' | 'date_asc' | 'modified' | 'title';

const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'published', label: 'Published', icon: CheckCircle2 },
  { id: 'scheduled', label: 'Scheduled', icon: CalendarClock },
  { id: 'draft', label: 'Drafts', icon: FileText },
];
const SORTS: { id: Sort; label: string }[] = [
  { id: 'date_desc', label: 'Publish date: newest first' },
  { id: 'date_asc', label: 'Publish date: oldest first' },
  { id: 'modified', label: 'Recently modified' },
  { id: 'title', label: 'A–Z' },
];


const BADGE: Record<Kind, { text: string; cls: string }> = {
  published: { text: 'Published', cls: 'bg-green-50 text-green-700 ring-green-600/20' },
  scheduled: { text: 'Scheduled', cls: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  draft: { text: 'Draft', cls: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
};

function relative(iso: string, now: number): string {
  const days = Math.round((new Date(iso).getTime() - now) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export default function ContentAdminList({ config }: { config: ContentListConfig }) {
  const defaultSort = (tab: Tab): Sort => (tab === 'scheduled' ? 'date_asc' : config.defaultSort);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const tab = (TABS.some(t => t.id === params.get('status')) ? params.get('status') : 'all') as Tab;
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sortParam = params.get('sort');
  const sort = (SORTS.some(s => s.id === sortParam) ? sortParam : defaultSort(tab)) as Sort;
  const [search, setSearch] = useState(q);

  // Filters live in the URL so a view can be bookmarked and survives Back.
  const setParams = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v); else sp.delete(k);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounced search → URL.
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => setParams({ q: search.trim() || null }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const load = () => {
    adminFetch(config.apiPath)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? `Failed to load ${config.noun}s`);
        setRows(((d.data ?? []) as Record<string, unknown>[]).map(config.mapRow ?? (x => x as unknown as Row)));
      })
      .catch(e => setError(e.message));
  };
  // config is a module-level constant per page, so loading once is correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const [forcedLive, setForcedLive] = useState<Set<string>>(() => new Set());
  const kindOf = (r: Row): Kind =>
    r.status === 'draft' ? 'draft' : forcedLive.has(r.id) ? 'published' : r.published_at && new Date(r.published_at).getTime() > now ? 'scheduled' : 'published';

  const counts = useMemo(() => {
    const c = { all: 0, published: 0, scheduled: 0, draft: 0 } as Record<Tab, number>;
    for (const r of rows ?? []) { c.all++; c[kindOf(r)]++; }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, forcedLive]);

  const categories = useMemo(() => [...new Set((rows ?? []).map(r => r.category))].sort(), [rows]);

  const nextScheduled = useMemo(
    () => (rows ?? []).filter(r => kindOf(r) === 'scheduled').sort((a, b) => (a.published_at ?? '').localeCompare(b.published_at ?? ''))[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, forcedLive],
  );

  const visible = useMemo(() => {
    const needle = q.toLowerCase();
    const dateOf = (r: Row) => r.published_at ?? r.updated_at;
    const list = (rows ?? []).filter(r =>
      (tab === 'all' || kindOf(r) === tab) &&
      (!category || r.category === category) &&
      (!needle || r.title.toLowerCase().includes(needle) || r.slug.includes(needle) || r.category.toLowerCase().includes(needle)),
    );
    list.sort((a, b) => {
      switch (sort) {
        case 'date_asc': return dateOf(a).localeCompare(dateOf(b));
        case 'modified': return b.updated_at.localeCompare(a.updated_at);
        case 'title': return a.title.localeCompare(b.title);
        default: return dateOf(b).localeCompare(dateOf(a));
      }
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tab, q, category, sort, forcedLive]);

  const filtered = !!q || !!category;

  const remove = async (r: Row) => {
    if (!window.confirm(`Delete "${r.title}" permanently? This cannot be undone.`)) return;
    const res = await adminFetch(`${config.apiPath}/${r.id}`, { method: 'DELETE' });
    if (!res.ok) { window.alert(`Could not delete the ${config.noun}.`); return; }
    load();
  };

  const [publishing, setPublishing] = useState<string | null>(null);
  const publishNow = async (r: Row) => {
    if (!window.confirm(`Publish "${r.title}" now instead of on ${formatDate(r.published_at!)}? It goes live immediately with today's date.`)) return;
    setPublishing(r.id);
    try {
      const res = await adminFetch(`${config.apiPath}/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish_now' }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { window.alert(d.error ?? `Could not publish the ${config.noun}.`); return; }
      // Treat it as live straight away (the page's clock was fixed at load),
      // then refresh from the server.
      setForcedLive(prev => new Set(prev).add(r.id));
      load();
    } finally {
      setPublishing(null);
    }
  };

  const actions = (r: Row) => (
    <div className="flex items-center gap-1.5">
      {kindOf(r) === 'scheduled' && (
        <button onClick={() => publishNow(r)} disabled={publishing === r.id} title="Publish now" aria-label={`Publish ${r.title} now`}
          className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md bg-[#F97316] px-2.5 text-xs font-semibold text-white hover:bg-[#EA580C] disabled:opacity-60">
          {publishing === r.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Publish
        </button>
      )}
      {/* Live posts open publicly; scheduled and drafts open the admin preview at the same URL. */}
      <Link href={`${config.publicPath}/${r.slug}`} target="_blank"
        title={kindOf(r) === 'published' ? 'View live' : 'Preview'} aria-label={`${kindOf(r) === 'published' ? 'View' : 'Preview'} ${r.title}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-[#4A5568] hover:border-[#F97316] hover:text-[#EA580C]">
        {kindOf(r) === 'published' ? <ExternalLink size={14} /> : <Eye size={14} />}
      </Link>
      {config.editHref && (
        <Link href={config.editHref(r.id)} title="Edit" aria-label={`Edit ${r.title}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-[#0D1117] hover:border-[#F97316] hover:text-[#EA580C]">
          <Pencil size={14} />
        </Link>
      )}
      <button onClick={() => remove(r)} title="Delete" aria-label={`Delete ${r.title}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50">
        <Trash2 size={14} />
      </button>
    </div>
  );

  const dateCell = (r: Row) => {
    const k = kindOf(r);
    if (k === 'draft') return <span className="text-[#8A96A8]">Not scheduled</span>;
    return (
      <div className="leading-tight">
        <div className="font-medium text-[#0D1117]">{formatDate(r.published_at!)}</div>
        <div className={cn('text-xs', k === 'scheduled' ? 'text-blue-700' : 'text-[#8A96A8]')}>{relative(r.published_at!, now)}</div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1117]">{config.heading}</h1>
          <p className="mt-1 text-sm text-[#4A5568]">
            {rows ? <>{counts.published} published · {counts.scheduled} scheduled · {counts.draft} draft{counts.draft === 1 ? '' : 's'}</> : 'Loading…'}
            {nextScheduled?.published_at && <> · next goes live <strong className="font-semibold text-[#0D1117]">{formatDate(nextScheduled.published_at)}</strong></>}
          </p>
        </div>
        {config.newHref && (
          <Link href={config.newHref} className="inline-flex items-center gap-1.5 rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#EA580C]">
            <PenSquare size={15} /> {config.newLabel ?? `Add new ${config.noun}`}
          </Link>
        )}
      </div>

      {/* Status tabs */}
      <div role="tablist" aria-label="Post status" className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-[#EEF1F7] p-1">
        {TABS.map(t => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} role="tab" aria-selected={active}
              onClick={() => setParams({ status: t.id === 'all' ? null : t.id, sort: null })}
              className={cn('inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                active ? 'bg-white text-[#0D1117] shadow-sm' : 'text-[#4A5568] hover:text-[#0D1117]')}>
              <Icon size={15} className={active ? 'text-[#EA580C]' : ''} />
              {t.label}
              <span className={cn('rounded-full px-2 py-0.5 text-xs', active ? 'bg-[#FFF7ED] text-[#C2410C]' : 'bg-white/70 text-[#4A5568]')}>
                {rows ? counts[t.id] : '–'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-2.5 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search {config.noun}s</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A96A8]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={config.searchPlaceholder}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-9 text-sm text-[#0D1117] focus:border-[#F97316] focus:outline-none" />
          {search && (
            <button type="button" onClick={() => { setSearch(''); setParams({ q: null }); }} aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A96A8] hover:text-[#0D1117]"><X size={15} /></button>
          )}
        </label>
        <select value={category} onChange={e => setParams({ category: e.target.value || null })} aria-label="Category"
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0D1117] focus:border-[#F97316] focus:outline-none">
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={e => setParams({ sort: e.target.value === defaultSort(tab) ? null : e.target.value })} aria-label="Sort"
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#0D1117] focus:border-[#F97316] focus:outline-none">
          {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {rows && (
        <div className="mb-3 flex items-center justify-between text-xs text-[#8A96A8]">
          <span>Showing {visible.length} of {tab === 'all' ? counts.all : counts[tab]} {tab === 'all' ? `${config.noun}s` : TABS.find(t => t.id === tab)!.label.toLowerCase()}</span>
          {filtered && (
            <button onClick={() => { setSearch(''); setParams({ q: null, category: null }); }} className="font-semibold text-[#EA580C] hover:underline">Clear filters</button>
          )}
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {!rows && !error && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#F97316]" /></div>}

      {rows && visible.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white px-6 py-14 text-center">
          <p className="font-semibold text-[#0D1117]">{rows.length === 0 ? `No ${config.noun}s yet` : `No ${config.noun}s match these filters`}</p>
          <p className="mt-1 text-sm text-[#4A5568]">{rows.length === 0 ? 'Nothing here yet.' : 'Try another search, category or tab.'}</p>
        </div>
      )}

      {rows && visible.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-[#E5E7EB] bg-white lg:block">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-left text-xs uppercase tracking-wide text-[#8A96A8]">
                <tr>
                  <th className="w-full px-4 py-3">{config.titleLabel ?? 'Title'}</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3">Publish date</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Last modified</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F9]">
                {visible.map(r => {
                  const b = BADGE[kindOf(r)];
                  return (
                    <tr key={r.id} className="align-top hover:bg-[#FAFBFD]">
                      <td className="px-4 py-3.5">
                        <Link href={config.editHref ? config.editHref(r.id) : `${config.publicPath}/${r.slug}`} target={config.editHref ? undefined : '_blank'} className="font-semibold leading-snug text-[#0D1117] hover:text-[#EA580C]">{r.title}</Link>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[#8A96A8]">
                          <span className="font-semibold text-[#EA580C]">{r.category}</span>
                          <span aria-hidden>·</span>
                          <span className="truncate">{config.publicPath}/{r.slug}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${b.cls}`}>{b.text}</span></td>
                      <td className="whitespace-nowrap px-4 py-3.5">{dateCell(r)}</td>
                      <td className="hidden whitespace-nowrap px-4 py-3.5 text-xs text-[#4A5568] xl:table-cell">
                        {formatDate(r.updated_at)}
                        <div className="text-[#8A96A8]">created {formatDate(r.created_at)}</div>
                      </td>
                      <td className="px-4 py-3.5"><div className="flex justify-end">{actions(r)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 lg:hidden">
            {visible.map(r => {
              const b = BADGE[kindOf(r)];
              return (
                <li key={r.id} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${b.cls}`}>{b.text}</span>
                    <span className="text-xs font-semibold text-[#EA580C]">{r.category}</span>
                  </div>
                  <Link href={config.editHref ? config.editHref(r.id) : `${config.publicPath}/${r.slug}`} target={config.editHref ? undefined : '_blank'} className="font-semibold leading-snug text-[#0D1117]">{r.title}</Link>
                  <div className="mt-3 flex items-end justify-between gap-3 text-sm">
                    {dateCell(r)}
                    {actions(r)}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
