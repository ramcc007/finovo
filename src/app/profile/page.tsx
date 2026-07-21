import type { Metadata } from 'next';
import { headers } from 'next/headers';
import ProfileForm from './ProfileForm';

export const metadata: Metadata = {
  title: 'Profile & Billing',
  description: 'Manage your Scripwise account, subscription, and billing details.',
  robots: { index: false, follow: true },
};

export default async function ProfilePage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <ProfileForm nonce={nonce} />;
}
