'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push('/watchlist');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#F4F6FA] px-4 py-12">
      <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-8">
        <h1 className="text-xl font-bold text-[#0D1117] mb-1">Log in</h1>
        <p className="text-sm text-[#4A5568] mb-6">Access your synced watchlist and saved screens.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#8A96A8] mb-1.5">Email</label>
            <div className="flex items-center gap-2.5 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus-within:border-[#F97316] transition-colors">
              <Mail size={15} className="text-[#8A96A8] shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8A96A8] mb-1.5">Password</label>
            <div className="flex items-center gap-2.5 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus-within:border-[#F97316] transition-colors">
              <Lock size={15} className="text-[#8A96A8] shrink-0" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
              />
            </div>
          </div>

          {error && <p className="text-sm text-[#DC2626]">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Log in'}
          </button>
        </form>

        <p className="text-sm text-[#4A5568] text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#F97316] font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
