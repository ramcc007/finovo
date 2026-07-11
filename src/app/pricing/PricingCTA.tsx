'use client';

import { useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';
import { authFetch } from '@/lib/authFetch';

/** Free-plan button: always just points into the product / signup. */
export function FreeCTA() {
  const { user, loading } = useAuth();
  if (loading) return <div className="btn btn-secondary w-full justify-center opacity-60">Loading…</div>;
  return user ? (
    <Link href="/screener" className="btn btn-secondary w-full justify-center">
      Go to Explorer
    </Link>
  ) : (
    <Link href="/signup" className="btn btn-secondary w-full justify-center">
      Get started free
    </Link>
  );
}

interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill?: { email?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

/** Pro-plan button. Logged-out → signup (they upgrade after). Logged-in →
 *  starts a Razorpay subscription and opens Checkout; degrades to a clear
 *  "launching shortly" message if Razorpay isn't configured yet. */
export function ProCTA({ nonce }: { nonce?: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  if (loading) return <div className="btn btn-primary w-full justify-center opacity-60">Loading…</div>;

  if (!user) {
    return (
      <Link href="/signup?intent=pro" className="btn btn-primary w-full justify-center">
        Go Pro — ₹499/yr <ArrowRight size={16} />
      </Link>
    );
  }

  // Polls billing status after a successful Checkout handoff — the webhook
  // is the actual source of truth, this just waits for it to land before
  // sending the user on, instead of claiming success before it's real.
  const waitForActivation = async () => {
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const res = await authFetch('/api/billing/status');
        if (res.ok) {
          const d = await res.json();
          if (d.active) {
            router.push('/profile?upgraded=1');
            return;
          }
        }
      } catch {
        // keep polling
      }
    }
    // Webhook is just slow — payment succeeded, so send them on regardless.
    router.push('/profile?upgraded=pending');
  };

  const startCheckout = async () => {
    setBusy(true);
    setNote(null);
    try {
      const res = await authFetch('/api/billing/subscribe', { method: 'POST' });
      if (res.status === 501) {
        setNote('Online payments are launching shortly — we will email you the moment Pro is live.');
        setBusy(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.subscriptionId || !data.keyId) {
        setNote(data.error && typeof data.error === 'string' && !data.error.includes('_')
          ? data.error
          : 'Something went wrong starting checkout. Please try again.');
        setBusy(false);
        return;
      }
      if (!scriptReady || !window.Razorpay) {
        setNote('Payment page is still loading — please try again in a moment.');
        setBusy(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'Scripwise',
        description: 'Scripwise Pro — Annual',
        prefill: { email: user.email ?? undefined },
        theme: { color: '#F97316' },
        handler: () => {
          setNote('Payment received — activating your Pro access…');
          void waitForActivation();
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
      // The Razorpay modal now owns the loading state visually; release our
      // own button spinner so it doesn't sit disabled behind the overlay.
      setBusy(false);
    } catch {
      setNote('Network error — please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="w-full">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        nonce={nonce}
        onLoad={() => setScriptReady(true)}
      />
      <button onClick={startCheckout} disabled={busy} className="btn btn-primary w-full justify-center disabled:opacity-60">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <>Upgrade to Pro — ₹499/yr <ArrowRight size={16} /></>}
      </button>
      {note && <p className="text-xs text-[#8A96A8] mt-2 text-center">{note}</p>}
    </div>
  );
}
