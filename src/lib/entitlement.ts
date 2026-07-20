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

const ANON_PREVIEW_MS = 3 * 60 * 1000;

/**
 * Anonymous-only, session-scoped grace window that unlocks the Scorecard for
 * a first-time visitor before they've had a chance to decide whether Pro is
 * worth it. Gated on `!ent.userId` at the call site — a signed-in Free user
 * is a known quantity already offered the paywall, so they get no preview.
 * Backed by a session cookie (middleware.ts) rather than anything durable,
 * so it resets on next browser session rather than being a one-time-ever grant.
 */
export function isWithinAnonPreview(req: NextRequest): boolean {
  const since = req.cookies.get('sw_anon_since')?.value;
  if (!since) return false;
  const startedAt = Number(since);
  if (!Number.isFinite(startedAt)) return false;
  return Date.now() - startedAt < ANON_PREVIEW_MS;
}

/** Does this plan unlock a given capability? */
export function planHasFeature(plan: PlanId, feature: FeatureKey): boolean {
  return plan === 'pro' && PRO_FEATURES.has(feature);
}
