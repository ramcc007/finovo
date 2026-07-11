import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isValidUserId } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabase';
import { razorpayAuthHeader } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

const PAYMENT_ID_RE = /^pay_[A-Za-z0-9]+$/;

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

    const totalPaise: number = pay.amount;
    const refundedPaise: number = pay.amount_refunded ?? 0;
    const refundablePaise = totalPaise - refundedPaise;
    if (refundablePaise <= 0) {
      return NextResponse.json({ error: 'This payment has already been fully refunded.' }, { status: 400 });
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

    const svc = getServiceClient();
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
    if (nowFullyRefunded) {
      await svc.from('subscriptions').update({
        plan: 'free',
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      }).eq('user_id', id);
    }

    return NextResponse.json({
      ok: true,
      refundId: refund.id,
      amountRefunded: refundedAmount,
      fullyRefunded: nowFullyRefunded,
    });
  } catch {
    return NextResponse.json({ error: 'Refund failed. Please try again.' }, { status: 502 });
  }
}
