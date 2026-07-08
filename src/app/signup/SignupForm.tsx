'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logLoginEvent } from '@/lib/AuthProvider';
import { adminFetch } from '@/lib/adminFetch';
import { validateEmail } from '@/lib/emailValidation';
import { validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/passwordPolicy';
import Turnstile from '@/components/auth/Turnstile';
import AuthTabs from '@/components/auth/AuthTabs';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const INVESTOR_PROFILES = [
  { id: 'beginner', label: 'Beginner', desc: 'New to investing, still learning the basics' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Comfortable with fundamentals, building a portfolio' },
  { id: 'experienced', label: 'Experienced', desc: 'Several years of hands-on investing experience' },
  { id: 'professional', label: 'Professional', desc: 'Investing as part of my profession — advisor, analyst, trader' },
  { id: 'institutional', label: 'Institutional', desc: 'Investing on behalf of a fund, family office, or institution' },
] as const;

function passwordStrength(pw: string): { label: string; color: string; score: number } {
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 14) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: '#DC2626', score };
  if (score <= 3) return { label: 'Okay', color: '#D97706', score };
  return { label: 'Strong', color: '#16A34A', score };
}

export default function SignupForm({ nonce }: { nonce?: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [investorProfile, setInvestorProfile] = useState<string | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCaptchaToken, setResendCaptchaToken] = useState<string | null>(null);
  const [resendWidgetKey, setResendWidgetKey] = useState(0);

  const strength = password ? passwordStrength(password) : null;

  useEffect(() => {
    if (!submitted || resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [submitted, resendCooldown]);

  const handleResend = async () => {
    setResendError(null);
    setResendSuccess(false);

    if (TURNSTILE_SITE_KEY && !resendCaptchaToken) {
      setResendError('Please complete the verification below.');
      return;
    }

    setResendLoading(true);
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: resendCaptchaToken ? { captchaToken: resendCaptchaToken } : undefined,
    });
    setResendLoading(false);

    // Turnstile tokens are single-use — force a fresh widget for next time.
    setResendCaptchaToken(null);
    setResendWidgetKey(k => k + 1);

    if (resendErr) {
      setResendError(
        /rate limit/i.test(resendErr.message)
          ? "We're sending too many emails right now — please try again in a few minutes."
          : resendErr.message
      );
      return;
    }
    setResendSuccess(true);
    setResendCooldown(30);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter your first and last name.');
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!investorProfile) {
      setError('Select your investor profile.');
      return;
    }
    if (!agreedTerms) {
      setError('You must agree to the Terms of Use and Privacy Policy.');
      return;
    }
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Please complete the verification below.');
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        ...(captchaToken ? { captchaToken } : {}),
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          city: city.trim() || null,
          investor_profile: investorProfile,
        },
      },
    });
    setLoading(false);

    // Turnstile tokens are single-use — force a fresh widget for a retry.
    setCaptchaToken(null);
    setWidgetKey(k => k + 1);

    if (signUpError) {
      setError(
        /rate limit/i.test(signUpError.message)
          ? "We're sending too many confirmation emails right now — please try again in a few minutes."
          : signUpError.message
      );
      return;
    }

    // If email confirmation is disabled in the Supabase project, a session
    // comes back immediately — send the user straight in. Otherwise, they
    // need to confirm via the email link first.
    if (data.session && data.user) {
      logLoginEvent(data.user.id, 'sign_up');
      try {
        const check = await adminFetch('/api/admin/check');
        const { isAdmin } = await check.json();
        router.push(isAdmin ? '/admin' : '/markets');
      } catch {
        router.push('/markets');
      }
    } else {
      if (data.user) logLoginEvent(data.user.id, 'sign_up');
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

          <div className="mt-5">
            {resendSuccess && (
              <p className="text-sm text-[#16A34A] mb-2">Confirmation email resent — check your inbox.</p>
            )}
            {resendError && (
              <p className="text-sm text-[#DC2626] mb-2">{resendError}</p>
            )}

            {TURNSTILE_SITE_KEY && resendCooldown === 0 && (
              <div className="flex justify-center mb-3">
                <Turnstile
                  key={resendWidgetKey}
                  siteKey={TURNSTILE_SITE_KEY}
                  onVerify={setResendCaptchaToken}
                  onExpire={() => setResendCaptchaToken(null)}
                  nonce={nonce}
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0 || (!!TURNSTILE_SITE_KEY && !resendCaptchaToken)}
              className="text-sm font-semibold text-[#F97316] hover:underline disabled:text-[#8A96A8] disabled:no-underline disabled:cursor-not-allowed"
            >
              {resendLoading
                ? 'Resending…'
                : resendCooldown > 0
                  ? `Resend email in ${resendCooldown}s`
                  : "Didn't get it? Resend email"}
            </button>
          </div>

          <Link href="/login" className="btn btn-primary w-full mt-6 justify-center">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#F4F6FA] px-4 py-12">
      <div className="max-w-lg w-full bg-white border border-[#E2E8F0] rounded-2xl p-8">
        <AuthTabs active="signup" />

        <h1 className="text-xl font-bold text-[#0D1117] mb-1">Create your free account</h1>
        <p className="text-sm text-[#4A5568] mb-6">
          Unlock Markets, Screens, Compare, Calendar and Watchlist — synced across devices.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8A96A8] mb-1.5">First name</label>
              <div className="flex items-center gap-2.5 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus-within:border-[#F97316] transition-colors">
                <User size={15} className="text-[#8A96A8] shrink-0" />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Aditya"
                  className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#8A96A8] mb-1.5">Last name</label>
              <div className="flex items-center gap-2.5 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus-within:border-[#F97316] transition-colors">
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Sharma"
                  className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
                />
              </div>
            </div>
          </div>

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
            <label className="block text-xs text-[#8A96A8] mb-1.5">City <span className="text-[#8A96A8] font-normal">(optional)</span></label>
            <div className="flex items-center gap-2.5 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus-within:border-[#F97316] transition-colors">
              <MapPin size={15} className="text-[#8A96A8] shrink-0" />
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Mumbai"
                className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8A96A8] mb-1.5">Password</label>
              <div className="flex items-center gap-2.5 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus-within:border-[#F97316] transition-colors">
                <Lock size={15} className="text-[#8A96A8] shrink-0" />
                <input
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={`${MIN_PASSWORD_LENGTH}+ chars, letters & numbers`}
                  className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
                />
              </div>
              {strength && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex-1 h-1 rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(strength.score / 5) * 100}%`, backgroundColor: strength.color }}
                    />
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
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
          </div>

          <div>
            <label className="block text-xs text-[#8A96A8] mb-1.5">Investor profile</label>
            <select
              required
              value={investorProfile ?? ''}
              onChange={e => setInvestorProfile(e.target.value || null)}
              className="bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus:outline-none focus:border-[#F97316] transition-colors text-sm w-full text-[#0D1117]"
            >
              <option value="" disabled>Select your investor profile</option>
              {INVESTOR_PROFILES.map(p => (
                <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-2.5 text-xs text-[#4A5568] leading-relaxed cursor-pointer">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={e => setAgreedTerms(e.target.checked)}
              className="mt-0.5 accent-[#F97316]"
            />
            <span>
              I agree to the <Link href="/terms" className="text-[#F97316] font-medium hover:underline">Terms of Use</Link> and{' '}
              <Link href="/privacy" className="text-[#F97316] font-medium hover:underline">Privacy Policy</Link>.
            </span>
          </label>

          {TURNSTILE_SITE_KEY && (
            <Turnstile
              key={widgetKey}
              siteKey={TURNSTILE_SITE_KEY}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
              nonce={nonce}
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
