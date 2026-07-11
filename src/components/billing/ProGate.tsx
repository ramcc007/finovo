'use client';

import Link from 'next/link';
import { Loader2, Lock, ArrowRight } from 'lucide-react';
import { useEntitlement } from '@/lib/useEntitlement';

interface Props {
  feature: string;
  description: string;
  children: React.ReactNode;
}

/** Whole-page gate for features that are Pro-only regardless of login state
 *  (e.g. Compare) — same visual language as AuthGate, one layer up. Assumes
 *  the caller is already wrapped in AuthGate (or otherwise known to be
 *  signed in); this only checks plan, not auth. */
export default function ProGate({ feature, description, children }: Props) {
  const ent = useEntitlement();

  if (ent.loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[#8A96A8]" />
      </div>
    );
  }

  if (!ent.active) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F4F6FA] px-4 py-16">
        <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#FFF3E8] text-[#EA580C] flex items-center justify-center mx-auto mb-5">
            <Lock size={20} />
          </div>
          <h1 className="text-xl font-bold text-[#0D1117] mb-2">{feature} is a Pro feature</h1>
          <p className="text-sm text-[#4A5568] leading-relaxed mb-7">{description}</p>
          <Link href="/pricing" className="btn btn-primary w-full justify-center">
            Upgrade to Pro — ₹499/yr <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
