import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Razorpay → us. This is the ONLY thing that grants/revokes Pro: it verifies
// the HMAC signature over the raw body, then writes the subscriptions row with
// the service role. A user can never reach this to upgrade themselves.
export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'not_configured' }, { status: 501 });

  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');

  // Constant-time compare; bail on any mismatch before trusting the payload.
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }

  const type = event.event as string | undefined;
  const payload = event.payload as Record<string, unknown> | undefined;
  const subEntity = (payload?.subscription as Record<string, unknown> | undefined)?.entity as
    | Record<string, unknown>
    | undefined;

  if (!subEntity) return NextResponse.json({ ok: true }); // not a subscription event we handle

  const razorpaySubId = subEntity.id as string | undefined;
  const userId = (subEntity.notes as Record<string, unknown> | undefined)?.user_id as string | undefined;
  const currentEnd = subEntity.current_end
    ? new Date((subEntity.current_end as number) * 1000).toISOString()
    : null;

  if (!razorpaySubId) return NextResponse.json({ ok: true });

  // Map Razorpay's lifecycle onto our status; Pro is active only when charged.
  let plan: 'free' | 'pro' = 'free';
  let status: 'pending' | 'active' | 'halted' | 'cancelled' | 'expired' = 'pending';
  switch (type) {
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.resumed':
      plan = 'pro';
      status = 'active';
      break;
    case 'subscription.halted':
      status = 'halted';
      break;
    case 'subscription.cancelled':
      status = 'cancelled';
      break;
    case 'subscription.completed':
    case 'subscription.expired':
      status = 'expired';
      break;
    default:
      return NextResponse.json({ ok: true }); // pending/authenticated/etc — no state change
  }

  const svc = getServiceClient();
  const row: Record<string, unknown> = {
    plan,
    status,
    razorpay_subscription_id: razorpaySubId,
    current_period_end: currentEnd,
    updated_at: new Date().toISOString(),
  };

  // Prefer the user_id carried in notes; fall back to matching the stored
  // subscription id recorded at checkout time.
  if (userId) {
    row.user_id = userId;
    await svc.from('subscriptions').upsert(row, { onConflict: 'user_id' });
  } else {
    await svc.from('subscriptions').update(row).eq('razorpay_subscription_id', razorpaySubId);
  }

  return NextResponse.json({ ok: true });
}
