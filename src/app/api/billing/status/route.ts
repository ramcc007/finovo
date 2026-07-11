import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getEntitlement } from '@/lib/entitlement';
import { syncSubscriptionStatus } from '@/lib/razorpaySync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ent = await getEntitlement(req);
  if (!ent.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getServiceClient();
  let { data: sub } = await client
    .from('subscriptions')
    .select('plan, status, current_period_end, razorpay_subscription_id')
    .eq('user_id', ent.userId)
    .maybeSingle();

  // Self-heal: if our local row isn't confirmed active but we have a
  // Razorpay subscription id, ask Razorpay directly rather than trusting a
  // possibly-stale row — covers a missed/misconfigured webhook or a
  // checkout whose client-side handler never fired (closed tab, UPI
  // app-switch, etc.).
  if (sub?.razorpay_subscription_id && sub.status !== 'active') {
    await syncSubscriptionStatus(ent.userId, sub.razorpay_subscription_id);
    const { data: refreshed } = await client
      .from('subscriptions')
      .select('plan, status, current_period_end, razorpay_subscription_id')
      .eq('user_id', ent.userId)
      .maybeSingle();
    sub = refreshed ?? sub;
  }

  const active = sub?.plan === 'pro' && sub?.status === 'active';

  return NextResponse.json({
    plan: active ? 'pro' : 'free',
    active,
    status: sub?.status ?? 'inactive',
    currentPeriodEnd: sub?.current_period_end ?? null,
  });
}
