import type { Metadata } from 'next';
import { Suspense } from 'react';
import GlossaryAdminList from './GlossaryAdminList';

export const metadata: Metadata = { title: 'Manage glossary', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GlossaryAdminList />
    </Suspense>
  );
}
