import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isValidUserId } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabase';
import { razorpayAuthHeader } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

interface PaymentRow {
  paymentId: string;
  invoiceId: string;
  amount: number; // rupees
  amountRefunded: number; // rupees
  refundable: number; // rupees still refundable
  status: string;
  paidAt: string | null;
}

// Lists the real charges behind a user's subscription, so the admin refund
// UI can show actual payment ids and remaining-refundable amounts instead of
// guessing from the subscription record (Razorpay refunds are issued
// against a payment, not a subscription).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });

  const authHeader = razorpayAuthHeader();
  if (!authHeader) return NextResponse.json({ error: 'not_configured' }, { status: 501 });

  const svc = getServiceClient();
  const { data: sub } = await svc
    .from('subscriptions')
    .select('razorpay_subscription_id')
    .eq('user_id', id)
    .maybeSingle();

  if (!sub?.razorpay_subscription_id) {
    return NextResponse.json({ payments: [] });
  }

  try {
    const invRes = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/invoices`,
      { headers: { Authorization: authHeader } }
    );
    if (!invRes.ok) return NextResponse.json({ error: 'Could not load payments from Razorpay.' }, { status: 502 });
    const invData = await invRes.json();
    const paidInvoices = (invData.items ?? []).filter(
      (inv: Record<string, unknown>) => inv.status === 'paid' && inv.payment_id
    );

    const payments: PaymentRow[] = [];
    for (const inv of paidInvoices) {
      const paymentId = inv.payment_id as string;
      const payRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        headers: { Authorization: authHeader },
      });
      if (!payRes.ok) continue;
      const pay = await payRes.json();
      const amount = (pay.amount as number) / 100;
      const amountRefunded = ((pay.amount_refunded as number) ?? 0) / 100;
      payments.push({
        paymentId,
        invoiceId: inv.id as string,
        amount,
        amountRefunded,
        refundable: Math.max(0, amount - amountRefunded),
        status: pay.status as string,
        paidAt: inv.paid_at ? new Date((inv.paid_at as number) * 1000).toISOString() : null,
      });
    }

    payments.sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));
    return NextResponse.json({ payments });
  } catch {
    return NextResponse.json({ error: 'Could not load payments from Razorpay.' }, { status: 502 });
  }
}
