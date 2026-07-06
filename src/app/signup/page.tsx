'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Turnstile from '@/components/auth/Turnstile';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Please complete the verification below.');
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If email confirmation is disabled in the Supabase project, a session
    // comes back immediately — send the user straight in. Otherwise, they
    // need to confirm via the email link first.
    if (data.session) {
      router.push('/watchlist');
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#F4F6FA] px-4">
        <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 text-[#16A34A]" size={40} />
          <h1 className="text-xl font-bold text-[#0D1117] mb-2">Check your inbox</h1>
          <p className="text-sm text-[#4A5568] leading-relaxed">
            We sent a confirmation link to <span className="font-semibold">{email}</span>.
            Click it to activate your account, then log in.
          </p>
          <Link href="/login" className="btn btn-primary w-full mt-6 justify-center">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#F4F6FA] px-4 py-12">
      <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-8">
        <h1 className="text-xl font-bold text-[#0D1117] mb-1">Create your account</h1>
        <p className="text-sm text-[#4A5568] mb-6">
          Sync your watchlist and saved screens across devices. Screening and research remain free without an account.
        </p>

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
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8A96A8] mb-1.5">Confirm password</label>
            <div className="flex items-center gap-2.5 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus-within:border-[#F97316] transition-colors">
              <Lock size={15} className="text-[#8A96A8] shrink-0" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
              />
            </div>
          </div>

          {TURNSTILE_SITE_KEY && (
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
            />
          )}

          {error && <p className="text-sm text-[#DC2626]">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-[#4A5568] text-center mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#F97316] font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
