import type { Metadata } from 'next';
import BlogAdminList from './BlogAdminList';

export const metadata: Metadata = { title: 'Manage blog', robots: { index: false, follow: false } };

export default function Page() {
  return <BlogAdminList />;
}
