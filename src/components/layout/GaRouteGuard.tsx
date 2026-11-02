'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Turns Google Analytics off on /admin pages and back on elsewhere, using
 *  GA's documented `window['ga-disable-<ID>']` opt-out flag. */
export default function GaRouteGuard({ id }: { id: string }) {
  const pathname = usePathname() ?? '';
  useLayoutEffect(() => {
    const admin = pathname === '/admin' || pathname.startsWith('/admin/');
    (window as unknown as Record<string, boolean>)[`ga-disable-${id}`] = admin;
  }, [pathname, id]);
  return null;
}
