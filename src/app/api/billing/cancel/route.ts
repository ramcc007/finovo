import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getEntitlement } from '@/lib/entitlement';

export const dynamic = 'force-dynamic';

// Cancels at the end of the current billing cycle — the user keeps Pro
// access until current_period_end, matching the Refund & Cancellation
// policy. The webhook (subscription.cancelled) is still the source of
// truth for status; this just tells Razorpay to stop renewing and
// reflects that intent immediately so the UI doesn't feel stuck.
export async function POST(req: NextRequest) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ error: 'not_configured' }, { status: 501 });

  const ent = await getEntitlement(req);
  if (!ent.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getServiceClient();
  const { data: sub } = await client
    .from('subscriptions')
    .select('razorpay_subscription_id, status')
    .eq('user_id', ent.userId)
    .maybeSingle();

  if (!sub?.razorpay_subscription_id) {
    return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 });
  }
  if (sub.status === 'cancelled') {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rzp = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_at_cycle_end: 1 }),
      }
    );
    if (!rzp.ok) {
      return NextResponse.json({ error: 'Could not cancel. Please try again.' }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: 'Could not cancel. Please try again.' }, { status: 502 });
  }

  // Razorpay's cancel-at-cycle-end leaves the subscription's own status as
  // 'active' until the cycle actually ends — there's nothing to read back
  // from their API that says "this is scheduled to cancel." Record that
  // intent ourselves, or the UI has no way to show it (and won't survive a
  // page reload).
  await client
    .from('subscriptions')
    .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
    .eq('user_id', ent.userId);

  return NextResponse.json({ ok: true });
}
