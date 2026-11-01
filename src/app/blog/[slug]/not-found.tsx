import type { Metadata } from 'next';
import AdminPostPreview from '@/components/blog/AdminPostPreview';

export const metadata: Metadata = { title: 'Post not found', robots: { index: false, follow: false } };

/** Public visitors get a plain 404. The admin, when signed in, sees a preview of a scheduled or draft post at its real URL. */
export default function BlogPostNotFound() {
  return <AdminPostPreview />;
}
