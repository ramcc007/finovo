'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2, PenSquare, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';
import { formatDate } from '@/lib/blog';
import AdminGate from '@/components/blog/AdminGate';

interface Row {
  id: string; slug: string; title: string; category: string;
  status: 'draft' | 'published'; published_at: string | null; updated_at: string; created_at: string;
}

function badge(r: Row) {
  if (r.status === 'draft') return { text: 'Draft', cls: 'bg-gray-100 text-gray-600' };
  if (r.published_at && new Date(r.published_at).getTime() > Date.now()) return { text: 'Scheduled', cls: 'bg-blue-50 text-blue-700' };
  return { text: 'Published', cls: 'bg-green-50 text-green-700' };
}

function List() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    adminFetch('/api/admin/blog')
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? 'Failed to load posts');
        setRows(d.data ?? []);
      })
      .catch(e => setError(e.message));
  };
  useEffect(load, []);

  const remove = async (r: Row) => {
    if (!window.confirm(`Delete "${r.title}" permanently? This cannot be undone.`)) return;
    const res = await adminFetch(`/api/admin/blog/${r.id}`, { method: 'DELETE' });
    if (!res.ok) { window.alert('Could not delete the post.'); return; }
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0D1117]">Blog posts</h1>
        <Link href="/admin/blog/new" className="inline-flex items-center gap-1.5 bg-[#F97316] text-white font-semibold rounded-lg px-4 py-2 text-sm hover:bg-[#EA580C]">
          <PenSquare size={14} /> Add new post
        </Link>
      </div>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {!rows && !error && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#F97316]" /></div>}
      {rows && rows.length === 0 && <p className="text-[#4A5568]">No posts yet. Create your first one.</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto border border-[#E5E7EB] rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB] text-left text-xs uppercase tracking-wide text-[#8A96A8]">
              <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Published</th><th className="px-4 py-3">Created / modified</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {rows.map(r => {
                const b = badge(r);
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold text-[#0D1117] max-w-xs">
                      <Link href={`/admin/blog/${r.id}`} className="hover:text-[#EA580C]">{r.title}</Link>
                      <div className="text-xs font-normal text-[#8A96A8]">/blog/{r.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-[#4A5568]">{r.category}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.cls}`}>{b.text}</span></td>
                    <td className="px-4 py-3 text-[#4A5568] whitespace-nowrap">{r.published_at ? formatDate(r.published_at) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-[#8A96A8] whitespace-nowrap">
                      <div>Created {formatDate(r.created_at)}</div>
                      <div>Modified {formatDate(r.updated_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {r.status === 'published' && (
                          <Link href={`/blog/${r.slug}`} className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] px-2.5 py-1 text-xs font-semibold hover:border-[#F97316]"><ExternalLink size={12} /> View</Link>
                        )}
                        <Link href={`/admin/blog/${r.id}`} className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] px-2.5 py-1 text-xs font-semibold hover:border-[#F97316]"><Pencil size={12} /> Edit</Link>
                        <button onClick={() => remove(r)} className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 size={12} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BlogAdminList() {
  return <AdminGate><List /></AdminGate>;
}
