import { headers } from 'next/headers';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <LoginForm nonce={nonce} />;
}
