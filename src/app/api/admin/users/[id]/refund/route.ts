import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isValidUserId } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabase';
import { razorpayAuthHeader } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

const PAYMENT_ID_RE = /^pay_[A-Za-z0-9]+$/;

// Refunding a payment does NOT cancel the underlying Razorpay subscription —
// it stays 'active' there. Our own status-sync reconciliation (which exists
// to rescue users stuck on a stale 'pending' row) trusts Razorpay as the
// source of truth, so without this it would silently re-grant Pro the next
// time the user's entitlement was checked, undoing the refund. Cancels
// immediately (not at cycle-end) since the money has already been returned.
// Returns a warning string on partial failure instead of throwing, so a
// successful refund is never reported as failed just because this cleanup
// step had trouble.
async function cancelSubscriptionAndDowngrade(
  svc: ReturnType<typeof getServiceClient>,
  authHeader: string,
  userId: string
): Promise<string | null> {
  const { data: sub } = await svc
    .from('subscriptions')
    .select('razorpay_subscription_id, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (sub?.razorpay_subscription_id && sub.status !== 'cancelled') {
    const rzpCancel = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`,
      {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_at_cycle_end: 0 }),
      }
    );
    if (!rzpCancel.ok) {
      return 'The subscription could not be cancelled automatically — cancel it manually in the Razorpay dashboard.';
    }
  }

  await svc.from('subscriptions').update({
    plan: 'free',
    status: 'cancelled',
    cancel_at_period_end: false,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });

  const authHeader = razorpayAuthHeader();
  if (!authHeader) return NextResponse.json({ error: 'not_configured' }, { status: 501 });

  const body = await req.json().catch(() => ({}));
  const paymentId: string = body?.paymentId ?? '';
  const amountRupees: number | undefined = typeof body?.amount === 'number' ? body.amount : undefined;

  if (!PAYMENT_ID_RE.test(paymentId)) {
    return NextResponse.json({ error: 'Invalid payment id.' }, { status: 400 });
  }
  if (amountRupees !== undefined && (!Number.isFinite(amountRupees) || amountRupees <= 0)) {
    return NextResponse.json({ error: 'Invalid refund amount.' }, { status: 400 });
  }

  try {
    // Verify the payment first — confirms it exists, gets its real amount
    // and what's already been refunded, so we never send a request that
    // over-refunds beyond what's actually left.
    const payRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: authHeader },
    });
    if (!payRes.ok) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
    const pay = await payRes.json();

    const svc = getServiceClient();
    const totalPaise: number = pay.amount;
    const refundedPaise: number = pay.amount_refunded ?? 0;
    const refundablePaise = totalPaise - refundedPaise;
    if (refundablePaise <= 0) {
      // Already fully refunded on Razorpay's side — but if our local row
      // still shows an active subscription (e.g. self-heal reconciliation
      // re-granted Pro because the subscription itself was never
      // cancelled), fix that now instead of just erroring out.
      const syncWarning = await cancelSubscriptionAndDowngrade(svc, authHeader, id);
      return NextResponse.json({
        ok: true,
        alreadyRefunded: true,
        fullyRefunded: true,
        amountRefunded: 0,
        message: syncWarning ?? 'Already fully refunded — subscription access has been synced to match.',
        warning: syncWarning ?? undefined,
      });
    }

    const requestedPaise = amountRupees !== undefined ? Math.round(amountRupees * 100) : refundablePaise;
    if (requestedPaise > refundablePaise) {
      return NextResponse.json({
        error: `Only ₹${(refundablePaise / 100).toFixed(2)} is left to refund on this payment.`,
      }, { status: 400 });
    }

    const rzp = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: requestedPaise,
        // "optimum" asks Razorpay to route the refund via the fastest
        // channel the original payment method supports (often
        // near-instant for UPI/cards) rather than the multi-day default.
        speed: 'optimum',
        notes: { refunded_by_admin: admin.email, user_id: id },
      }),
    });
    const refund = await rzp.json();
    if (!rzp.ok || !refund?.id) {
      return NextResponse.json({
        error: refund?.error?.description || 'Refund failed. Please try again.',
      }, { status: 502 });
    }

    const refundedAmount = requestedPaise / 100;

    await svc.from('refund_events').insert({
      admin_id: admin.id,
      user_id: id,
      razorpay_payment_id: paymentId,
      amount: refundedAmount,
    });

    // A full refund (nothing left refundable after this one) revokes Pro
    // immediately — giving the money back while leaving paid features
    // unlocked would be inconsistent.
    const nowFullyRefunded = requestedPaise >= refundablePaise;
    const syncWarning = nowFullyRefunded ? await cancelSubscriptionAndDowngrade(svc, authHeader, id) : null;

    return NextResponse.json({
      ok: true,
      refundId: refund.id,
      amountRefunded: refundedAmount,
      fullyRefunded: nowFullyRefunded,
      warning: syncWarning ?? undefined,
    });
  } catch {
    return NextResponse.json({ error: 'Refund failed. Please try again.' }, { status: 502 });
  }
}
