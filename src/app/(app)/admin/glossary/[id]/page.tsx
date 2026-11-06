import type { Metadata } from 'next';
import AdminGate from '@/components/blog/AdminGate';
import GlossaryEditor from '../GlossaryEditor';

export const metadata: Metadata = { title: 'Edit glossary term', robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminGate><GlossaryEditor id={id} /></AdminGate>;
}
