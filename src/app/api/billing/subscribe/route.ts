import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getEntitlementFromToken, getBearerToken } from '@/lib/entitlement';

export const dynamic = 'force-dynamic';

// Creates a Razorpay subscription for the signed-in user and returns the ids
// the browser needs to open Razorpay Checkout. No SDK — a single REST call
// with Basic auth. Returns 501 until the Razorpay env vars are configured, so
// the pricing page's "Upgrade" button degrades gracefully in the meantime.
//
// Vercel serverless functions bake in env vars at deploy time — changing a
// var's value in the dashboard does NOT retroactively update an
// already-built deployment. A fresh deploy created after the save is
// required for a new RAZORPAY_PLAN_ID to actually take effect.
export async function POST(req: NextRequest) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!keyId || !keySecret || !planId) {
    return NextResponse.json({ error: 'not_configured' }, { status: 501 });
  }

  const token = getBearerToken(req);
  const ent = await getEntitlementFromToken(token);
  if (!ent.userId) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  if (ent.active) return NextResponse.json({ error: 'You are already on Pro.' }, { status: 400 });

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rzp = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        // total_count is the number of billing cycles Razorpay will run
        // before the subscription auto-completes — NOT "renews forever".
        // total_count: 1 was wrong: it would charge once and then stop
        // auto-renewing. Razorpay has no literal "until cancelled" option,
        // so the standard pattern is a large cycle count (100 years on an
        // annual plan) and let /api/billing/cancel actually end it.
        total_count: 100,
        customer_notify: 1,
        notes: { user_id: ent.userId },
      }),
    });
    const sub = await rzp.json();
    if (!rzp.ok || !sub?.id) {
      return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
    }

    // Record the mapping so the webhook can resolve subscription → user, even
    // if the notes field is ever dropped.
    const svc = getServiceClient();
    await svc.from('subscriptions').upsert(
      { user_id: ent.userId, plan: 'free', status: 'pending', razorpay_subscription_id: sub.id, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

    // planId is a public identifier (not a secret) — returning it lets the
    // caller self-verify in DevTools which Plan Vercel actually resolved,
    // without needing server-log access.
    return NextResponse.json({ subscriptionId: sub.id, keyId, planId });
  } catch {
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
  }
}
