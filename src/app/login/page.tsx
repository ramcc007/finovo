import type { Metadata } from 'next';
import { headers } from 'next/headers';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to your Scripwise account to access your watchlist, saved screens, and Scorecard.',
  robots: { index: false, follow: true },
};

export default async function LoginPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <LoginForm nonce={nonce} />;
}
