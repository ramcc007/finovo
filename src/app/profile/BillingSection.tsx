'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { useEntitlement } from '@/lib/useEntitlement';
import { formatTradeDate } from '@/lib/utils';

export default function BillingSection() {
  const ent = useEntitlement();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  const handleCancel = async () => {
    if (!window.confirm('Cancel your Pro subscription? You will keep access until the end of your current billing year.')) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await authFetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCancelError(typeof data.error === 'string' ? data.error : 'Could not cancel. Please try again.');
        return;
      }
      setCancelled(true);
    } catch {
      setCancelError('Network error — please try again.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="card-plain p-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard size={16} className="text-[#8A96A8]" />
        <h2 className="text-sm font-semibold text-[#0D1117]">Billing</h2>
      </div>

      {ent.loading ? (
        <div className="flex items-center gap-2 text-sm text-[#8A96A8]">
          <Loader2 size={14} className="animate-spin" /> Loading plan…
        </div>
      ) : ent.active ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] px-3.5 py-2.5">
            <CheckCircle2 size={16} className="text-[#16A34A] shrink-0" />
            <div className="text-sm text-[#166534]">
              <span className="font-semibold">Scripwise Pro</span> is active
              {ent.currentPeriodEnd && (
                <> · {(cancelled || ent.cancelAtPeriodEnd) ? 'access until' : 'renews'} {formatTradeDate(ent.currentPeriodEnd)}</>
              )}
            </div>
          </div>
          {cancelled || ent.cancelAtPeriodEnd ? (
            <p className="text-sm text-[#4A5568]">
              Your subscription will not renew. You&apos;ll keep Pro access until{' '}
              {ent.currentPeriodEnd ? formatTradeDate(ent.currentPeriodEnd) : 'the end of your billing year'}.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="text-sm font-medium text-[#DC2626] hover:underline disabled:opacity-60"
              >
                {cancelling ? 'Cancelling…' : 'Cancel subscription'}
              </button>
              {cancelError && <p className="text-sm text-[#DC2626]">{cancelError}</p>}
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-[#4A5568]">You&apos;re on the <span className="font-semibold">Free</span> plan.</p>
          <Link href="/pricing" className="btn btn-primary !py-2 !px-4 !text-[13px]">
            Upgrade to Pro — ₹499/yr <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
