import { headers } from 'next/headers';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <ProfileForm nonce={nonce} />;
}
