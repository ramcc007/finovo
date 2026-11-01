'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { adminFetch } from '@/lib/adminFetch';

/** UI-only admin check (server routes re-verify on every request). */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    adminFetch('/api/admin/check')
      .then(r => r.json())
      .then(d => { if (alive) setAdmin(!!d.isAdmin); })
      .catch(() => { if (alive) setAdmin(false); });
    return () => { alive = false; };
  }, [user]);
  return !!user && admin;
}
