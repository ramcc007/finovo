'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';
import { adminFetch } from '@/lib/adminFetch';

/** Renders children only for the admin; everyone else sees a sign-in / no-access notice. */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [state, setState] = useState<'checking' | 'admin' | 'denied'>('checking');

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    let alive = true;
    adminFetch('/api/admin/check')
      .then(r => r.json())
      .then(d => { if (alive) setState(d.isAdmin ? 'admin' : 'denied'); })
      .catch(() => { if (alive) setState('denied'); });
    return () => { alive = false; };
  }, [user, loading]);

  if (loading || (user && state === 'checking')) {
    return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#F97316]" /></div>;
  }
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <ShieldAlert className="mx-auto mb-3 text-[#F97316]" />
        <p className="text-[#4A5568] mb-4">Sign in with the admin account to manage the blog.</p>
        <Link href="/login" className="inline-block bg-[#F97316] text-white font-semibold rounded-lg px-4 py-2 hover:bg-[#EA580C]">Log in</Link>
      </div>
    );
  }
  if (state !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <ShieldAlert className="mx-auto mb-3 text-red-500" />
        <p className="text-[#4A5568]">This account doesn&apos;t have admin access.</p>
      </div>
    );
  }
  return <>{children}</>;
}
