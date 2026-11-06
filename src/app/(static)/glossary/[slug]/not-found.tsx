import type { Metadata } from 'next';
import GlossaryAdminPreview from '@/components/glossary/GlossaryAdminPreview';

export const metadata: Metadata = { title: 'Term not found', robots: { index: false, follow: false } };

/** Public visitors get a plain 404. The signed-in admin sees a preview of a scheduled or draft term at its real URL. */
export default function GlossaryTermNotFound() {
  return <GlossaryAdminPreview />;
}
