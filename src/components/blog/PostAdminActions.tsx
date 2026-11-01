'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { adminFetch } from '@/lib/adminFetch';

/** Edit / Delete buttons for one post — rendered only for the admin. */
export default function PostAdminActions({ id, title, redirectTo }: { id: string; title: string; redirectTo?: string }) {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!isAdmin) return null;

  const remove = async () => {
    if (!window.confirm(`Delete "${title}" permanently? This cannot be undone.`)) return;
    setBusy(true);
    const r = await adminFetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (!r.ok) { window.alert('Could not delete the post.'); return; }
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <Link href={`/admin/blog/${id}`} className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] px-2.5 py-1 font-semibold text-[#0D1117] hover:border-[#F97316]">
        <Pencil size={12} /> Edit
      </Link>
      <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
        <Trash2 size={12} /> Delete
      </button>
    </div>
  );
}
