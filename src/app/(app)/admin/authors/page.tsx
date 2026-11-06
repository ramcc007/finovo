import type { Metadata } from 'next';
import AdminGate from '@/components/blog/AdminGate';
import AuthorsAdmin from './AuthorsAdmin';

export const metadata: Metadata = { title: 'Manage authors', robots: { index: false, follow: false } };

export default function Page() {
  return <AdminGate><AuthorsAdmin /></AdminGate>;
}
