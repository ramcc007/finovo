'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { authFetch } from '@/lib/authFetch';
import type { PlanId } from '@/lib/plans';

interface EntitlementState {
  plan: PlanId;
  active: boolean;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  loading: boolean;
}

const DEFAULT_STATE: EntitlementState = {
  plan: 'free', active: false, status: 'inactive', currentPeriodEnd: null, cancelAtPeriodEnd: false, loading: true,
};

/** Client-side read of the signed-in user's plan — for UI decisions only
 *  (locking buttons, showing upsells). The actual enforcement always
 *  happens server-side via getEntitlement(); this can be trusted for
 *  "should I show a lock icon", never for "should I return the data". */
export function useEntitlement() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<EntitlementState>(DEFAULT_STATE);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setState({ ...DEFAULT_STATE, loading: false }); return; }

    let alive = true;
    authFetch('/api/billing/status')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive) return;
        if (!d) { setState({ ...DEFAULT_STATE, loading: false }); return; }
        setState({
          plan: d.plan, active: d.active, status: d.status,
          currentPeriodEnd: d.currentPeriodEnd, cancelAtPeriodEnd: !!d.cancelAtPeriodEnd,
          loading: false,
        });
      })
      .catch(() => { if (alive) setState({ ...DEFAULT_STATE, loading: false }); });
    return () => { alive = false; };
  }, [user, authLoading]);

  return state;
}
