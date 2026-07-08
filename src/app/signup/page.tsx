import { headers } from 'next/headers';
import SignupForm from './SignupForm';

export default async function SignupPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <SignupForm nonce={nonce} />;
}
