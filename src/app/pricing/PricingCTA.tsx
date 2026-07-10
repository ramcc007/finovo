'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';

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

/** Pro-plan button. Logged-out → signup (they upgrade after). Logged-in →
 *  kicks off checkout once Razorpay is wired; until then it degrades to a
 *  clear "launching shortly" message rather than a dead button. */
export function ProCTA() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (loading) return <div className="btn btn-primary w-full justify-center opacity-60">Loading…</div>;

  if (!user) {
    return (
      <Link href="/signup?intent=pro" className="btn btn-primary w-full justify-center">
        Go Pro — ₹499/yr <ArrowRight size={16} />
      </Link>
    );
  }

  const startCheckout = async () => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/billing/subscribe', { method: 'POST' });
      if (res.status === 501) {
        setNote('Online payments are launching shortly — we will email you the moment Pro is live.');
        return;
      }
      if (!res.ok) {
        setNote('Something went wrong starting checkout. Please try again.');
        return;
      }
      // Razorpay checkout handoff will be wired here.
    } catch {
      setNote('Network error — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full">
      <button onClick={startCheckout} disabled={busy} className="btn btn-primary w-full justify-center disabled:opacity-60">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <>Upgrade to Pro — ₹499/yr <ArrowRight size={16} /></>}
      </button>
      {note && <p className="text-xs text-[#8A96A8] mt-2 text-center">{note}</p>}
    </div>
  );
}
