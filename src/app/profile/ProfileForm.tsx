'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/passwordPolicy';
import Turnstile from '@/components/auth/Turnstile';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface Profile {
  first_name: string | null;
  last_name: string | null;
}

export default function ProfileForm({ nonce }: { nonce?: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [requestSending, setRequestSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const [recoveryMode, setRecoveryMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoverySaving, setRecoverySaving] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySaved, setRecoverySaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setFirstName(data?.first_name ?? '');
        setLastName(data?.last_name ?? '');
      });
  }, [user]);

  // Landing back here after clicking the password-change confirmation email
  // fires a PASSWORD_RECOVERY event — that's the only way updateUser({password})
  // is allowed to actually take effect from this page.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSaved(false);
    if (!firstName.trim() || !lastName.trim()) {
      setNameError('Enter your first and last name.');
      return;
    }
    if (!user) return;
    setNameSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName.trim(), last_name: lastName.trim() })
      .eq('id', user.id);
    setNameSaving(false);
    if (error) {
      setNameError('Failed to save. Please try again.');
      return;
    }
    setNameSaved(true);
  };

  const handleRequestPasswordChange = async () => {
    setRequestError(null);
    setRequestSent(false);
    if (!user?.email) return;
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setRequestError('Please complete the verification below.');
      return;
    }
    setRequestSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/profile` : undefined,
      captchaToken: captchaToken ?? undefined,
    });
    setRequestSending(false);
    if (error) {
      setRequestError(
        /rate limit/i.test(error.message)
          ? "We're sending too many emails right now — please try again in a few minutes."
          : error.message
      );
      return;
    }
    setRequestSent(true);
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    if (!currentPassword) {
      setRecoveryError('Enter your current password.');
      return;
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setRecoveryError(passwordError);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setRecoveryError('Passwords do not match.');
      return;
    }
    if (!user?.email) return;
    setRecoverySaving(true);

    // Re-verify identity with the current password before honoring the
    // recovery session — the emailed link alone shouldn't be sufficient
    // if it's ever intercepted or the session is left open on a shared device.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      setRecoverySaving(false);
      setRecoveryError('Current password is incorrect.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setRecoverySaving(false);
    if (error) {
      setRecoveryError(error.message);
      return;
    }
    setRecoverySaved(true);
    setRecoveryMode(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[#8A96A8]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-6">
        <div>
          <h1 className="h-section text-[#0D1117]">Account Settings</h1>
          <p className="text-sm text-[#4A5568] mt-1.5">Manage your name and password.</p>
        </div>

        {/* Recovery mode: set new password after clicking the emailed link */}
        {recoveryMode && (
          <div className="card-plain p-6 border-2 border-[#F97316]">
            <h2 className="text-sm font-semibold text-[#0D1117] mb-1">Set your new password</h2>
            <p className="text-xs text-[#4A5568] mb-4">You&apos;ve confirmed this change via email — choose a new password below.</p>
            <form onSubmit={handleSetNewPassword} className="space-y-3">
              <div>
                <label className="block text-xs text-[#8A96A8] mb-1.5">Current password</label>
                <div className="flex items-center gap-2.5 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus-within:border-[#F97316] transition-colors">
                  <Lock size={15} className="text-[#8A96A8] shrink-0" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#8A96A8] mb-1.5">New password</label>
                <div className="flex items-center gap-2.5 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus-within:border-[#F97316] transition-colors">
                  <Lock size={15} className="text-[#8A96A8] shrink-0" />
                  <input
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={`${MIN_PASSWORD_LENGTH}+ chars, letters & numbers`}
                    className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#8A96A8] mb-1.5">Confirm new password</label>
                <div className="flex items-center gap-2.5 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus-within:border-[#F97316] transition-colors">
                  <Lock size={15} className="text-[#8A96A8] shrink-0" />
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="bg-transparent text-sm outline-none w-full placeholder:text-[#8A96A8]"
                  />
                </div>
              </div>
              {recoveryError && <p className="text-sm text-[#DC2626]">{recoveryError}</p>}
              <button type="submit" disabled={recoverySaving} className="btn btn-primary w-full justify-center disabled:opacity-60">
                {recoverySaving ? <Loader2 size={16} className="animate-spin" /> : 'Update password'}
              </button>
            </form>
          </div>
        )}

        {/* Account info */}
        <div className="card-plain p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-[#8A96A8]" />
            <h2 className="text-sm font-semibold text-[#0D1117]">Name</h2>
          </div>

          <div className="flex items-center gap-2.5 bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 mb-4">
            <Mail size={15} className="text-[#8A96A8] shrink-0" />
            <span className="text-sm text-[#4A5568]">{user.email}</span>
            <span className="ml-auto text-[10px] font-medium text-[#8A96A8] uppercase tracking-wide">Can&apos;t be changed</span>
          </div>

          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8A96A8] mb-1.5">First name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus:outline-none focus:border-[#F97316] transition-colors text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A96A8] mb-1.5">Last name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="bg-[#F4F6FA] border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 focus:outline-none focus:border-[#F97316] transition-colors text-sm w-full"
                />
              </div>
            </div>
            {nameSaved && <p className="text-sm text-[#16A34A]">Saved.</p>}
            {nameError && <p className="text-sm text-[#DC2626]">{nameError}</p>}
            <button type="submit" disabled={nameSaving || !profile} className="btn btn-primary justify-center disabled:opacity-60">
              {nameSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save name'}
            </button>
          </form>
        </div>

        {/* Password change */}
        <div className="card-plain p-6">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={16} className="text-[#8A96A8]" />
            <h2 className="text-sm font-semibold text-[#0D1117]">Password</h2>
          </div>
          <p className="text-xs text-[#4A5568] mb-4">
            For your security, changing your password requires confirming via a link we email to {user.email}.
          </p>

          {requestSent ? (
            <div className="flex items-center gap-2 text-sm text-[#16A34A]">
              <CheckCircle2 size={16} />
              Check your inbox — click the link to set a new password.
            </div>
          ) : (
            <>
              {TURNSTILE_SITE_KEY && (
                <div className="mb-3">
                  <Turnstile siteKey={TURNSTILE_SITE_KEY} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} nonce={nonce} />
                </div>
              )}
              {requestError && <p className="text-sm text-[#DC2626] mb-3">{requestError}</p>}
              <button
                type="button"
                onClick={handleRequestPasswordChange}
                disabled={requestSending}
                className="btn btn-secondary disabled:opacity-60"
              >
                {requestSending ? <Loader2 size={16} className="animate-spin" /> : 'Send password change email'}
              </button>
            </>
          )}

          {recoverySaved && (
            <p className="text-sm text-[#16A34A] mt-3">Password updated successfully.</p>
          )}
        </div>
      </div>
    </div>
  );
}
