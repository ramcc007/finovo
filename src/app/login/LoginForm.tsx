'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { adminFetch } from '@/lib/adminFetch';
import Turnstile from '@/components/auth/Turnstile';
import AuthTabs from '@/components/auth/AuthTabs';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function LoginForm({ nonce }: { nonce?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [forgotCaptchaToken, setForgotCaptchaToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Please complete the verification below.');
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    setLoading(false);

    if (signInError) {
      setError(
        /banned|suspended/i.test(signInError.message)
          ? 'Your account has been suspended. Contact support if you believe this is a mistake.'
          : signInError.message
      );
      return;
    }

    try {
      const check = await adminFetch('/api/admin/check');
      const { isAdmin } = await check.json();
      router.push(isAdmin ? '/admin' : '/markets');
    } catch {
      router.push('/markets');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (TURNSTILE_SITE_KEY && !forgotCaptchaToken) {
      setError('Please complete the verification below.');
      return;
    }
    setResetLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
      captchaToken: forgotCaptchaToken ?? undefined,
    });
    setResetLoading(false);
    if (resetError) {
      setError(
        /rate limit/i.test(resetError.message)
          ? "We're sending too many emails right now — please try again in a few minutes."
          : resetError.message
      );
      return;
    }
    setResetSent(true);
  };

  if (forgotMode) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#F4F6FA] px-4 py-12">
        <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-8">
          {resetSent ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-4 text-[#16A34A]" size={40} />
              <h1 className="text-xl font-bold text-[#0D1117] mb-2">Check your inbox</h1>
              <p className="text-sm text-[#4A5568] leading-relaxed">
                If an account exists for <span className="font-semibold">{email}</span>, we&apos;ve sent a password reset link.
              </p>
              <button
                onClick={() => { setForgotMode(false); setResetSent(false); }}
                className="btn btn-primary w-full mt-6 justify-center"
              >
                Back to login
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-[#0D1117] mb-1">Reset your password</h1>
              <p className="text-sm text-[#4A5568] mb-6">Enter your email and we&apos;ll send you a reset link.</p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
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
                {TURNSTILE_SITE_KEY && (
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    onVerify={setForgotCaptchaToken}
                    onExpire={() => setForgotCaptchaToken(null)}
                    nonce={nonce}
                  />
                )}
                {error && <p className="text-sm text-[#DC2626]">{error}</p>}
                <button type="submit" disabled={resetLoading} className="btn btn-primary w-full justify-center disabled:opacity-60">
                  {resetLoading ? <Loader2 size={16} className="animate-spin" /> : 'Send reset link'}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="w-full text-center text-sm font-medium text-[#4A5568] hover:text-[#0D1117] py-1"
                >
                  Back to login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#F4F6FA] px-4 py-12">
      <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-8">
        <AuthTabs active="login" />

        <h1 className="text-xl font-bold text-[#0D1117] mb-1">Welcome back</h1>
        <p className="text-sm text-[#4A5568] mb-6">Access Markets, Screens, Compare, Corporate Calendars and so much more!</p>

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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-[#8A96A8]">Password</label>
              <button
                type="button"
                onClick={() => setForgotMode(true)}
                className="text-xs text-[#F97316] font-medium hover:underline"
              >
                Forgot password?
              </button>
            </div>
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

          {TURNSTILE_SITE_KEY && (
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
              nonce={nonce}
            />
          )}

          {error && <p className="text-sm text-[#DC2626]">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Log in'}
          </button>
        </form>

        <p className="text-sm text-[#4A5568] text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#F97316] font-semibold hover:underline">Sign up free</Link>
        </p>
      </div>
    </div>
  );
}
