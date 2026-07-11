import { getServiceClient } from '@/lib/supabase';

/**
 * Actively checks Razorpay for a subscription's real status and writes it to
 * `subscriptions`. This exists because relying only on (a) the webhook
 * firing, and (b) the client-side Checkout `handler` callback firing, is
 * fragile — a closed tab, a UPI app-switch, or a webhook misconfiguration
 * can all leave a paying user stuck on "pending" forever with no recovery
 * path. Called lazily from /api/billing/status so the moment a user (or the
 * post-checkout poll) checks their plan, we ask Razorpay directly instead of
 * trusting a stale local row.
 */
export async function syncSubscriptionStatus(userId: string, razorpaySubscriptionId: string): Promise<void> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return;

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${razorpaySubscriptionId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return;
    const sub = await res.json();

    // Razorpay subscription statuses: created, authenticated, active, pending,
    // halted, cancelled, completed, expired.
    let plan: 'free' | 'pro' = 'free';
    let status: 'pending' | 'active' | 'halted' | 'cancelled' | 'expired' = 'pending';
    switch (sub.status) {
      case 'active':
        plan = 'pro';
        status = 'active';
        break;
      case 'halted':
        status = 'halted';
        break;
      case 'cancelled':
        status = 'cancelled';
        break;
      case 'completed':
      case 'expired':
        status = 'expired';
        break;
      case 'created':
      case 'authenticated':
      case 'pending':
      default:
        status = 'pending';
        break;
    }

    const currentPeriodEnd = sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null;

    const svc = getServiceClient();
    await svc.from('subscriptions').update({
      plan,
      status,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
  } catch {
    // Best-effort — if Razorpay's API is unreachable, the stored row (and
    // the webhook, if it eventually lands) remain the fallback truth.
  }
}
