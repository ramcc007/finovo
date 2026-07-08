'use client';

import Link from 'next/link';
import { Loader2, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';

interface Props {
  feature: string;
  description: string;
  children: React.ReactNode;
}

export default function AuthGate({ feature, description, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[#8A96A8]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F4F6FA] px-4 py-16">
        <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#FFF3E8] text-[#EA580C] flex items-center justify-center mx-auto mb-5">
            <Lock size={20} />
          </div>
          <h1 className="text-xl font-bold text-[#0D1117] mb-2">{feature} is for members</h1>
          <p className="text-sm text-[#4A5568] leading-relaxed mb-7">{description}</p>
          <div className="flex flex-col gap-2.5">
            <Link href="/signup" className="btn btn-primary w-full justify-center">
              Create free account <ArrowRight size={14} />
            </Link>
            <Link
              href="/login"
              className="w-full text-center text-sm font-medium text-[#4A5568] hover:text-[#0D1117] py-2.5 rounded-lg hover:bg-[#F4F6FA] transition-colors"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
