import type { Metadata } from 'next';
import AdminGate from '@/components/blog/AdminGate';
import ElectionAdmin from './ElectionAdmin';

export const metadata: Metadata = { title: 'Manage election coverage', robots: { index: false, follow: false } };

export default function Page() {
  return <AdminGate><ElectionAdmin /></AdminGate>;
}
