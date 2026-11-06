import type { Metadata } from 'next';
import AdminGate from '@/components/blog/AdminGate';
import GlossaryEditor from '../GlossaryEditor';

export const metadata: Metadata = { title: 'New glossary term', robots: { index: false, follow: false } };

export default function Page() {
  return <AdminGate><GlossaryEditor /></AdminGate>;
}
