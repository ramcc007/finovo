'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { adminFetch } from '@/lib/adminFetch';

const FLAG = 'sw_ga_off';

function readFlag(): boolean {
  try { return localStorage.getItem(FLAG) === '1'; } catch { return false; }
}
function writeFlag(on: boolean) {
  try { if (on) localStorage.setItem(FLAG, '1'); else localStorage.removeItem(FLAG); } catch { /* storage blocked */ }
}

/** Keeps Google Analytics off for the site owner, using GA's documented
 *  `window['ga-disable-<ID>']` opt-out flag:
 *  - always on /admin pages;
 *  - everywhere in a browser where the admin account has signed in. That is
 *    remembered in localStorage (read by /ga4-init.js before the first page
 *    view), so it also covers later logged-out visits on that device. A
 *    different, non-admin account signing in clears it. */
export default function GaRouteGuard({ id }: { id: string }) {
  const pathname = usePathname() ?? '';
  const { user, loading } = useAuth();
  const [ownerDevice, setOwnerDevice] = useState(readFlag);

  useEffect(() => {
    if (loading || !user) return;
    let alive = true;
    adminFetch('/api/admin/check')
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        const admin = !!d.isAdmin;
        writeFlag(admin);
        setOwnerDevice(admin);
      })
      .catch(() => { /* keep the current setting */ });
    return () => { alive = false; };
  }, [user, loading]);

  useLayoutEffect(() => {
    const adminPage = pathname === '/admin' || pathname.startsWith('/admin/');
    (window as unknown as Record<string, boolean>)[`ga-disable-${id}`] = adminPage || ownerDevice;
  }, [pathname, id, ownerDevice]);

  return null;
}
