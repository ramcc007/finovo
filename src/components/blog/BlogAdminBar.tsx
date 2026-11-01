'use client';

import Link from 'next/link';
import { PenSquare, ListChecks } from 'lucide-react';
import { useIsAdmin } from '@/lib/useIsAdmin';

/** Shown only to the admin, at the top of /blog. */
export default function BlogAdminBar() {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3 text-sm">
      <span className="font-semibold text-[#9A3412]">Admin</span>
      <Link href="/admin/blog/new" className="inline-flex items-center gap-1.5 rounded-md bg-[#F97316] px-3 py-1.5 font-semibold text-white hover:bg-[#EA580C]">
        <PenSquare size={14} /> New post
      </Link>
      <Link href="/admin/blog" className="inline-flex items-center gap-1.5 rounded-md border border-[#FED7AA] bg-white px-3 py-1.5 font-semibold text-[#9A3412] hover:border-[#F97316]">
        <ListChecks size={14} /> Manage all posts (incl. drafts)
      </Link>
    </div>
  );
}
