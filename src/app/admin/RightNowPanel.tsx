'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';

interface Realtime {
  activeUsers: number;
  pageViews: number;
  perMinute: number[]; // 30 values, oldest first
  pages: { title: string; users: number; views: number }[];
  devices: { category: string; users: number }[];
  locations: { country: string; city: string; users: number }[];
}

const POLL_MS = 60_000;

/** Live GA4 data for the last 30 minutes, polled every minute while the tab is visible. */
export default function RightNowPanel() {
  const [data, setData] = useState<Realtime | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminFetch('/api/admin/analytics/realtime', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Failed to load realtime data');
      setData(d); setError(null); setFetchedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load realtime data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') void load(); };
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearTimeout(first); clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [load]);

  if (error === 'GA4 analytics not configured') return null; // the snapshot card already explains this

  const max = Math.max(1, ...(data?.perMinute ?? [0]));

  return (
    <div className="card-plain p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <h2 className="text-sm font-semibold text-[#0D1117]">Right now</h2>
          <span className="text-xs text-[#8A96A8]">last 30 minutes · updates every minute</span>
        </div>
        <div className="flex items-center gap-2">
          {fetchedAt && (
            <span className="text-[11px] text-[#8A96A8]">
              Updated {new Date(fetchedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <button type="button" onClick={() => void load()} disabled={loading} title="Refresh now" aria-label="Refresh realtime data"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4A5568] hover:border-[#F97316] hover:text-[#EA580C] disabled:opacity-60">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!data ? (
        !error && <div className="h-28 animate-pulse rounded-lg bg-[#EEF1F7]" />
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-[auto_auto_1fr] md:items-end">
            <div className="rounded-[8px] bg-[#F4F6FA] p-3 md:min-w-36">
              <div className="tnum text-xl font-bold text-[#0D1117]">{data.activeUsers.toLocaleString('en-IN')}</div>
              <div className="mt-0.5 text-[11px] text-[#8A96A8]">Active users</div>
            </div>
            <div className="rounded-[8px] bg-[#F4F6FA] p-3 md:min-w-36">
              <div className="tnum text-xl font-bold text-[#0D1117]">{data.pageViews.toLocaleString('en-IN')}</div>
              <div className="mt-0.5 text-[11px] text-[#8A96A8]">Page views</div>
            </div>
            <div>
              <div className="mb-1 text-[11px] text-[#8A96A8]">Active users per minute</div>
              <div className="flex h-14 items-end gap-[3px]" role="img"
                aria-label={`Active users per minute over the last 30 minutes, peak ${max}`}>
                {data.perMinute.map((v, i) => (
                  <div key={i} title={`${29 - i === 0 ? 'Now' : `${29 - i} min ago`}: ${v} user${v === 1 ? '' : 's'}`}
                    className={v > 0 ? 'flex-1 rounded-t-sm bg-[#F97316]' : 'flex-1 rounded-t-sm bg-[#EEF1F7]'}
                    style={{ height: v > 0 ? `${Math.max(12, (v / max) * 100)}%` : '3px' }} />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-[#8A96A8]"><span>−30 min</span><span>now</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <List title="Pages (by title)" empty="No visitors in the last 30 minutes."
              rows={data.pages.map(p => ({ key: p.title, label: p.title || '(not set)', value: p.views }))} />
            <List title="Devices" empty="—"
              rows={data.devices.map(d => ({ key: d.category, label: d.category, value: d.users, capitalize: true }))} />
            <List title="Locations" empty="—"
              rows={data.locations.map((l, i) => ({
                key: `${l.country}-${l.city}-${i}`,
                label: `${l.city && l.city !== '(not set)' ? `${l.city}, ` : ''}${l.country || 'Unknown'}`,
                value: l.users,
              }))} />
          </div>
        </>
      )}
    </div>
  );
}

function List({ title, rows, empty }: {
  title: string; empty: string;
  rows: { key: string; label: string; value: number; capitalize?: boolean }[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#4A5568]">{title}</h3>
      <div className="space-y-1.5">
        {rows.length === 0 ? <p className="text-sm text-[#8A96A8]">{empty}</p> : rows.map(r => (
          <div key={r.key} className="flex items-center justify-between text-sm">
            <span className={`truncate pr-2 text-[#4A5568] ${r.capitalize ? 'capitalize' : ''}`}>{r.label}</span>
            <span className="tnum shrink-0 font-semibold text-[#0D1117]">{r.value.toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
