import type { Metadata } from 'next';
import AdminPageClient from './AdminPageClient';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminPageClient />;
}
