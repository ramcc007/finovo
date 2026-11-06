import type { Metadata } from 'next';
import { headers } from 'next/headers';
import SignupForm from './SignupForm';

export const metadata: Metadata = {
  title: 'Sign Up Free',
  description: 'Create a free Scripwise account to save your watchlist, custom screens, and unlock the Scripwise Scorecard.',
};

export default async function SignupPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <SignupForm nonce={nonce} />;
}
