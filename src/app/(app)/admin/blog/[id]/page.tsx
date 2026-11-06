import type { Metadata } from 'next';
import AdminGate from '@/components/blog/AdminGate';
import BlogEditor from '../BlogEditor';

export const metadata: Metadata = { title: 'Edit post', robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminGate><BlogEditor id={id} /></AdminGate>;
}
