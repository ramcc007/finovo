import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import type { PlanId, FeatureKey } from '@/lib/plans';
import { PRO_FEATURES } from '@/lib/plans';

export interface Entitlement {
  userId: string | null;
  plan: PlanId;
  active: boolean; // true only for a live Pro subscription
}

const FREE: Entitlement = { userId: null, plan: 'free', active: false };

/**
 * Server-side source of truth for what a caller is entitled to. Verifies the
 * Bearer token against Supabase, then reads the (service-role-only)
 * subscriptions row. Fails safe to Free on any error — including the
 * subscriptions table not existing yet — so gating can be added before
 * billing is fully live without breaking anything.
 */
export async function getEntitlementFromToken(token: string | null): Promise<Entitlement> {
  if (!token) return FREE;
  const client = getServiceClient();

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return FREE;
  const userId = data.user.id;

  try {
    const { data: sub } = await client
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    const notExpired = !sub?.current_period_end || new Date(sub.current_period_end) > new Date();
    if (sub && sub.plan === 'pro' && sub.status === 'active' && notExpired) {
      return { userId, plan: 'pro', active: true };
    }
  } catch {
    // Table missing or transient error → treat as Free (safe default).
  }
  return { userId, plan: 'free', active: false };
}

export function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') ?? '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

export async function getEntitlement(req: NextRequest): Promise<Entitlement> {
  return getEntitlementFromToken(getBearerToken(req));
}

/** Does this plan unlock a given capability? */
export function planHasFeature(plan: PlanId, feature: FeatureKey): boolean {
  return plan === 'pro' && PRO_FEATURES.has(feature);
}
