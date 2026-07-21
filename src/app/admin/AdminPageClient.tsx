'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, Users, BarChart3, Ban, Trash2, ShieldCheck, Search, KeyRound, IndianRupee } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';
import { adminFetch } from '@/lib/adminFetch';
import { validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/passwordPolicy';
import { cn } from '@/lib/utils';
import RefundModal from './RefundModal';

interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  investor_profile: string | null;
  plan: 'free' | 'pro';
  subscriptionStatus: string | null;
  hasSubscription: boolean;
}

interface Overview {
  activeUsers: number; newUsers: number; sessions: number; pageViews: number; avgSessionSec: number;
}
interface Analytics {
  last7d: Overview; last30d: Overview;
  topPages: { path: string; views: number }[];
  devices: { category: string; users: number }[];
  locations: { country: string; city: string; users: number }[];
}

function isBanned(u: AdminUserRow): boolean {
  if (!u.banned_until) return false;
  return new Date(u.banned_until).getTime() > Date.now();
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function AdminPageClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [range, setRange] = useState<'7d' | '30d'>('7d');

  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<AdminUserRow | null>(null);

  const loadUsers = () => {
    adminFetch('/api/admin/users')
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? 'Failed to load users');
        setUsers(d.data ?? []);
      })
      .catch(e => setUsersError(e.message));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    adminFetch('/api/admin/check')
      .then(r => r.json())
      .then(d => { setIsAdmin(!!d.isAdmin); setChecked(true); })
      .catch(() => { setIsAdmin(false); setChecked(true); });
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!checked || !isAdmin) return;

    adminFetch('/api/admin/analytics')
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? 'Failed to load analytics');
        setAnalytics(d);
      })
      .catch(e => setAnalyticsError(e.message));

    loadUsers();
  }, [checked, isAdmin]);

  const handleSuspend = async (u: AdminUserRow) => {
    const suspend = !isBanned(u);
    if (suspend && !window.confirm(`Suspend ${u.email}? They won't be able to log in until unsuspended.`)) return;
    setActingId(u.id);
    try {
      const r = await adminFetch(`/api/admin/users/${u.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Action failed');
      setUsers(prev => prev?.map(x => x.id === u.id
        ? { ...x, banned_until: suspend ? new Date(Date.now() + 87600 * 3600000).toISOString() : null }
        : x) ?? null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (u: AdminUserRow) => {
    if (!window.confirm(`Permanently delete ${u.email}? This cannot be undone.`)) return;
    setActingId(u.id);
    try {
      const r = await adminFetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Delete failed');
      setUsers(prev => prev?.filter(x => x.id !== u.id) ?? null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setActingId(null);
    }
  };

  const handleSetPassword = async (u: AdminUserRow) => {
    const password = window.prompt(`Set a new password for ${u.email} (min ${MIN_PASSWORD_LENGTH} chars, letters & numbers):`);
    if (!password) return;
    const passwordError = validatePassword(password);
    if (passwordError) { alert(passwordError); return; }
    setActingId(u.id);
    try {
      const r = await adminFetch(`/api/admin/users/${u.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to set password');
      alert(`Password updated for ${u.email}.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to set password');
    } finally {
      setActingId(null);
    }
  };

  if (authLoading || !checked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[#8A96A8]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F4F6FA] px-4 py-16">
        <div className="max-w-sm w-full bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mx-auto mb-5">
            <ShieldAlert size={20} />
          </div>
          <h1 className="text-lg font-bold text-[#0D1117] mb-2">Not authorized</h1>
          <p className="text-sm text-[#4A5568]">This page is restricted.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users?.filter(u => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [u.email, u.first_name, u.last_name, u.city].some(v => v?.toLowerCase().includes(q));
  }) ?? null;

  const ov = analytics ? (range === '7d' ? analytics.last7d : analytics.last30d) : null;

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-8">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-[#F97316]" />
          <h1 className="h-section text-[#0D1117]">Admin Dashboard</h1>
        </div>

        {/* GA4 snapshot */}
        <div className="card-plain p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[#8A96A8]" />
              <h2 className="text-sm font-semibold text-[#0D1117]">Traffic Snapshot</h2>
            </div>
            <div className="inline-flex items-center gap-0.5 bg-[#EEF1F7] p-0.5 rounded-lg">
              {(['7d', '30d'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    'text-xs font-semibold px-3 py-1.5 rounded-md transition-all',
                    range === r ? 'bg-white text-[#0D1117] shadow-sm' : 'text-[#4A5568] hover:text-[#0D1117]'
                  )}
                >
                  Last {r}
                </button>
              ))}
            </div>
          </div>

          {analyticsError ? (
            <p className="text-sm text-[#8A96A8]">
              {analyticsError === 'GA4 analytics not configured'
                ? 'GA4 analytics isn’t configured yet — set GA4_PROPERTY_ID, GA4_SERVICE_ACCOUNT_EMAIL and GA4_SERVICE_ACCOUNT_PRIVATE_KEY in Vercel.'
                : analyticsError}
            </p>
          ) : !ov ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-[#EEF1F7] rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {[
                  { label: 'Active Users', value: ov.activeUsers.toLocaleString('en-IN') },
                  { label: 'New Users', value: ov.newUsers.toLocaleString('en-IN') },
                  { label: 'Sessions', value: ov.sessions.toLocaleString('en-IN') },
                  { label: 'Page Views', value: ov.pageViews.toLocaleString('en-IN') },
                  { label: 'Avg Session', value: fmtDuration(ov.avgSessionSec) },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-[8px] bg-[#F4F6FA]">
                    <div className="tnum text-xl font-bold text-[#0D1117]">{s.value}</div>
                    <div className="text-[11px] text-[#8A96A8] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-2">Top Pages (30d)</h3>
                  <div className="space-y-1.5">
                    {analytics!.topPages.length === 0 ? (
                      <p className="text-sm text-[#8A96A8]">No data yet.</p>
                    ) : analytics!.topPages.map(p => (
                      <div key={p.path} className="flex items-center justify-between text-sm">
                        <span className="text-[#4A5568] truncate pr-2">{p.path}</span>
                        <span className="tnum font-semibold text-[#0D1117] shrink-0">{p.views.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-2">Devices (30d)</h3>
                  <div className="space-y-1.5">
                    {analytics!.devices.length === 0 ? (
                      <p className="text-sm text-[#8A96A8]">No data yet.</p>
                    ) : analytics!.devices.map(d => (
                      <div key={d.category} className="flex items-center justify-between text-sm">
                        <span className="text-[#4A5568] capitalize">{d.category}</span>
                        <span className="tnum font-semibold text-[#0D1117]">{d.users.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-2">Top Locations (30d)</h3>
                  <div className="space-y-1.5">
                    {analytics!.locations.length === 0 ? (
                      <p className="text-sm text-[#8A96A8]">No data yet.</p>
                    ) : analytics!.locations.map((l, i) => (
                      <div key={`${l.country}-${l.city}-${i}`} className="flex items-center justify-between text-sm">
                        <span className="text-[#4A5568] truncate pr-2">
                          {l.city && l.city !== '(not set)' ? `${l.city}, ` : ''}{l.country || 'Unknown'}
                        </span>
                        <span className="tnum font-semibold text-[#0D1117] shrink-0">{l.users.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Users */}
        <div className="card-plain p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EDF0F7] flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#8A96A8]" />
              <h2 className="text-sm font-semibold text-[#0D1117]">
                Users {users ? `(${users.length})` : ''}
              </h2>
            </div>
            <div className="flex items-center gap-2 bg-[#F4F6FA] border border-[#E2E8F0] rounded-lg px-3 py-1.5 w-full sm:w-64">
              <Search size={14} className="text-[#8A96A8] shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search email, name, city…"
                className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th className="text-left">User</th>
                  <th className="text-left">City</th>
                  <th className="text-left">Profile</th>
                  <th>Plan</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usersError ? (
                  <tr><td colSpan={8} className="text-center py-10 text-[#DC2626] font-sans">{usersError}</td></tr>
                ) : !filteredUsers ? (
                  Array(6).fill(0).map((_, i) => (
                    <tr key={i}>{Array(8).fill(0).map((_, j) => (
                      <td key={j}><div className="h-4 bg-[#EEF1F7] rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-[#8A96A8] font-sans">No users found.</td></tr>
                ) : filteredUsers.map(u => {
                  const banned = isBanned(u);
                  const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
                  const isSelf = !!user?.email && u.email?.toLowerCase() === user.email.toLowerCase();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="font-semibold text-[#0D1117]">{name || '—'}</div>
                        <div className="text-[11px] text-[#8A96A8] font-sans mt-0.5">{u.email}</div>
                      </td>
                      <td className="text-[#4A5568] font-sans text-xs">{u.city ?? '—'}</td>
                      <td className="text-[#4A5568] font-sans text-xs capitalize">{u.investor_profile ?? '—'}</td>
                      <td>
                        <span className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded',
                          u.plan === 'pro' ? 'bg-[#FFF3E8] text-[#F97316]' : 'bg-[#F4F6FA] text-[#8A96A8]'
                        )}>
                          {u.plan === 'pro' ? 'PRO' : 'Free'}
                        </span>
                      </td>
                      <td className="text-xs">{fmtDate(u.created_at)}</td>
                      <td className="text-xs">{fmtDate(u.last_sign_in_at)}</td>
                      <td>
                        <div className="flex flex-col gap-1 items-center">
                          <span className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded',
                            banned ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#DCFCE7] text-[#16A34A]'
                          )}>
                            {banned ? 'Suspended' : 'Active'}
                          </span>
                          {!u.email_confirmed_at && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#FEF3C7] text-[#D97706]">
                              Unconfirmed
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {isSelf ? (
                          <div className="flex items-center justify-center gap-1">
                            {u.hasSubscription && (
                              <button
                                onClick={() => setRefundTarget(u)}
                                title="Refund"
                                className="p-2 rounded-md text-[#16A34A] hover:bg-[#DCFCE7] transition-colors"
                              >
                                <IndianRupee size={14} />
                              </button>
                            )}
                            <span className="text-[10px] text-[#8A96A8] italic px-1">Your account</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            {u.hasSubscription && (
                              <button
                                onClick={() => setRefundTarget(u)}
                                title="Refund"
                                className="p-2 rounded-md text-[#16A34A] hover:bg-[#DCFCE7] transition-colors"
                              >
                                <IndianRupee size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleSetPassword(u)}
                              disabled={actingId === u.id}
                              title="Set new password"
                              className="p-2 rounded-md text-[#4A5568] hover:bg-[#F4F6FA] transition-colors disabled:opacity-40"
                            >
                              <KeyRound size={14} />
                            </button>
                            <button
                              onClick={() => handleSuspend(u)}
                              disabled={actingId === u.id}
                              title={banned ? 'Unsuspend' : 'Suspend'}
                              className={cn(
                                'p-2 rounded-md transition-colors disabled:opacity-40',
                                banned ? 'text-[#16A34A] hover:bg-[#DCFCE7]' : 'text-[#D97706] hover:bg-[#FEF3C7]'
                              )}
                            >
                              {banned ? <ShieldCheck size={14} /> : <Ban size={14} />}
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={actingId === u.id}
                              title="Delete"
                              className="p-2 rounded-md text-[#DC2626] hover:bg-[#FEE2E2] transition-colors disabled:opacity-40"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {refundTarget && (
        <RefundModal
          userId={refundTarget.id}
          userEmail={refundTarget.email}
          onClose={() => setRefundTarget(null)}
          onRefunded={loadUsers}
        />
      )}
    </div>
  );
}
