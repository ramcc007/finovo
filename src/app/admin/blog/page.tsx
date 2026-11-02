import type { Metadata } from 'next';
import { Suspense } from 'react';
import BlogAdminList from './BlogAdminList';

export const metadata: Metadata = { title: 'Manage blog', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BlogAdminList />
    </Suspense>
  );
}
