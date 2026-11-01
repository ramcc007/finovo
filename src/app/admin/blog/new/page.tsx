import type { Metadata } from 'next';
import AdminGate from '@/components/blog/AdminGate';
import BlogEditor from '../BlogEditor';

export const metadata: Metadata = { title: 'New post', robots: { index: false, follow: false } };

export default function Page() {
  return <AdminGate><BlogEditor /></AdminGate>;
}
