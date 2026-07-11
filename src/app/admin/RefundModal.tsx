'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, IndianRupee, CheckCircle2 } from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';

interface Payment {
  paymentId: string;
  invoiceId: string;
  amount: number;
  amountRefunded: number;
  refundable: number;
  status: string;
  paidAt: string | null;
}

interface Props {
  userId: string;
  userEmail: string | null;
  onClose: () => void;
  onRefunded: () => void; // tells the parent list to refresh (plan may have flipped to free)
}

export default function RefundModal({ userId, userEmail, onClose, onRefunded }: Props) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, { ok: boolean; message: string }>>({});

  useEffect(() => {
    let alive = true;
    adminFetch(`/api/admin/users/${userId}/payments`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error === 'not_configured' ? 'Payments are not configured.' : (d.error ?? 'Failed to load payments'));
        if (!alive) return;
        setPayments(d.payments ?? []);
        const initial: Record<string, string> = {};
        for (const p of d.payments ?? []) initial[p.paymentId] = p.refundable.toFixed(2);
        setAmounts(initial);
      })
      .catch(e => { if (alive) setLoadError(e instanceof Error ? e.message : 'Failed to load payments'); });
    return () => { alive = false; };
  }, [userId]);

  const handleRefund = async (p: Payment) => {
    const raw = amounts[p.paymentId];
    const amount = parseFloat(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      setResult(r => ({ ...r, [p.paymentId]: { ok: false, message: 'Enter a valid amount.' } }));
      return;
    }
    if (amount > p.refundable) {
      setResult(r => ({ ...r, [p.paymentId]: { ok: false, message: `Only ₹${p.refundable.toFixed(2)} is refundable.` } }));
      return;
    }
    if (!window.confirm(`Refund ₹${amount.toFixed(2)} to ${userEmail ?? 'this user'}? This goes back to their original payment method immediately.`)) return;

    setBusyId(p.paymentId);
    setResult(r => ({ ...r, [p.paymentId]: undefined as unknown as { ok: boolean; message: string } }));
    try {
      const res = await adminFetch(`/api/admin/users/${userId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: p.paymentId, amount }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Refund failed');
      setResult(r => ({ ...r, [p.paymentId]: { ok: true, message: `Refunded ₹${d.amountRefunded.toFixed(2)}${d.fullyRefunded ? ' — Pro access revoked.' : '.'}` } }));
      setPayments(prev => prev?.map(x => x.paymentId === p.paymentId
        ? { ...x, amountRefunded: x.amountRefunded + amount, refundable: x.refundable - amount }
        : x) ?? null);
      onRefunded();
    } catch (e) {
      setResult(r => ({ ...r, [p.paymentId]: { ok: false, message: e instanceof Error ? e.message : 'Refund failed' } }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(16,24,40,0.25)] w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDF0F7] sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <IndianRupee size={16} className="text-[#F97316]" />
            <h2 className="text-sm font-semibold text-[#0D1117]">Refund — {userEmail}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#F4F6FA] text-[#8A96A8]">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {loadError ? (
            <p className="text-sm text-[#DC2626]">{loadError}</p>
          ) : !payments ? (
            <div className="flex items-center gap-2 text-sm text-[#8A96A8]">
              <Loader2 size={14} className="animate-spin" /> Loading payment history…
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-[#8A96A8]">No payments found for this user.</p>
          ) : (
            <div className="space-y-4">
              {payments.map(p => {
                const r = result[p.paymentId];
                const done = p.refundable <= 0;
                return (
                  <div key={p.paymentId} className="rounded-[10px] border border-[#E2E8F0] p-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold text-[#0D1117]">₹{p.amount.toFixed(2)}</span>
                      <span className="text-xs text-[#8A96A8]">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    <div className="text-xs text-[#8A96A8] font-mono mb-3">{p.paymentId}</div>
                    {p.amountRefunded > 0 && (
                      <p className="text-xs text-[#D97706] mb-2">Already refunded: ₹{p.amountRefunded.toFixed(2)}</p>
                    )}
                    {done ? (
                      <p className="text-xs text-[#16A34A] flex items-center gap-1"><CheckCircle2 size={13} /> Fully refunded.</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[6px] px-2.5 py-1.5 flex-1">
                          <span className="text-xs text-[#8A96A8]">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={p.refundable}
                            value={amounts[p.paymentId] ?? ''}
                            onChange={e => setAmounts(a => ({ ...a, [p.paymentId]: e.target.value }))}
                            className="bg-transparent text-sm outline-none w-full"
                          />
                        </div>
                        <button
                          onClick={() => handleRefund(p)}
                          disabled={busyId === p.paymentId}
                          className="btn btn-primary !py-1.5 !px-3 !text-xs shrink-0 disabled:opacity-60"
                        >
                          {busyId === p.paymentId ? <Loader2 size={13} className="animate-spin" /> : 'Refund'}
                        </button>
                      </div>
                    )}
                    {r && (
                      <p className={`text-xs mt-2 ${r.ok ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{r.message}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-[#8A96A8] mt-4 leading-relaxed">
            Refunds are sent via Razorpay&apos;s fastest available channel for the original payment method — often
            near-instant, though timing ultimately depends on the customer&apos;s bank. A full refund on a payment
            immediately revokes that user&apos;s Pro access.
          </p>
        </div>
      </div>
    </div>
  );
}
