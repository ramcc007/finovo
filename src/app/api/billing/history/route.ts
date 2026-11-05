import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { getEntitlementFromToken, getBearerToken } from '@/lib/entitlement';
import { razorpayAuthHeader } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

interface Payment {
  id: string;
  date: string | null;
  amount: number; // rupees
  currency: string;
  status: string;
  receiptUrl: string | null;
}

/** The signed-in user's own payments for Pro, with Razorpay's hosted receipt link for each. Read-only. */
export async function GET(req: NextRequest) {
  const ent = await getEntitlementFromToken(getBearerToken(req));
  if (!ent.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = razorpayAuthHeader();
  if (!auth) return NextResponse.json({ payments: [] });

  const { data: sub } = await getServiceClient()
    .from('subscriptions').select('razorpay_subscription_id').eq('user_id', ent.userId).maybeSingle();
  const subId = sub?.razorpay_subscription_id;
  if (!subId || !/^sub_[A-Za-z0-9]+$/.test(subId)) return NextResponse.json({ payments: [] });

  try {
    const res = await fetch(`https://api.razorpay.com/v1/invoices?subscription_id=${subId}`, { headers: { Authorization: auth } });
    if (!res.ok) return NextResponse.json({ error: 'Could not load payments right now.' }, { status: 502 });
    const data = await res.json();
    const payments: Payment[] = (data.items ?? [])
      .filter((i: Record<string, unknown>) => i.status === 'paid')
      .map((i: Record<string, unknown>) => ({
        id: String(i.id),
        date: i.paid_at ? new Date((i.paid_at as number) * 1000).toISOString() : null,
        amount: ((i.amount_paid ?? i.amount ?? 0) as number) / 100,
        currency: String(i.currency ?? 'INR'),
        status: 'Paid',
        receiptUrl: typeof i.short_url === 'string' && i.short_url.startsWith('https://') ? i.short_url : null,
      }))
      .sort((a: Payment, b: Payment) => (b.date ?? '').localeCompare(a.date ?? ''));
    return NextResponse.json({ payments });
  } catch {
    return NextResponse.json({ error: 'Could not load payments right now.' }, { status: 502 });
  }
}
