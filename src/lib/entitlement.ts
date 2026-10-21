import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import type { PlanId, FeatureKey } from '@/lib/plans';
import { PRO_FEATURES } from '@/lib/plans';

export interface Entitlement {
  userId: string | null;
  plan: PlanId;
  active: boolean; // true only for a live Pro subscription (or the admin)
  admin?: boolean;
  preview?: boolean; // anonymous visitor inside the free full-access window
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

  // The admin gets every Pro feature unlocked without needing a subscription
  // row. Same identity check as requireAdmin(): immutable ADMIN_USER_ID when
  // set, ADMIN_EMAIL as a fallback.
  const adminUserId = process.env.ADMIN_USER_ID;
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = adminUserId
    ? userId === adminUserId
    : !!adminEmail && !!data.user.email && data.user.email.toLowerCase() === adminEmail.toLowerCase();
  if (isAdmin) return { userId, plan: 'pro', active: true, admin: true };

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

export const ANON_PREVIEW_MS = 30 * 60 * 1000;

/**
 * Milliseconds left in an anonymous visitor's free full-access window, or 0.
 * Backed by a session cookie (middleware.ts) rather than anything durable,
 * so it resets on next browser session rather than being a one-time-ever grant.
 */
export function anonPreviewRemainingMs(req: NextRequest): number {
  const since = req.cookies.get('sw_anon_since')?.value;
  if (!since) return 0;
  const startedAt = Number(since);
  if (!Number.isFinite(startedAt)) return 0;
  return Math.max(0, ANON_PREVIEW_MS - (Date.now() - startedAt));
}

/**
 * Request-level entitlement. Signed-in callers resolve from their token. An
 * anonymous (no token) first-time visitor gets every Pro feature unlocked for
 * their first ANON_PREVIEW_MS on the site, so they can see what the product
 * does before deciding. A signed-in Free user is a known quantity already
 * offered the paywall, so gets no preview.
 */
export async function getEntitlement(req: NextRequest): Promise<Entitlement> {
  const token = getBearerToken(req);
  const ent = await getEntitlementFromToken(token);
  if (!ent.userId && anonPreviewRemainingMs(req) > 0) {
    return { userId: null, plan: 'pro', active: true, preview: true };
  }
  return ent;
}

/** Does this plan unlock a given capability? */
export function planHasFeature(plan: PlanId, feature: FeatureKey): boolean {
  return plan === 'pro' && PRO_FEATURES.has(feature);
}
