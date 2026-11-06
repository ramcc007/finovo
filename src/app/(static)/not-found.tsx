import type { Metadata } from 'next';
import NotFoundContent from '@/components/layout/NotFoundContent';

export const metadata: Metadata = { title: 'Page not found', robots: { index: false, follow: true } };

/** Site-wide 404 for any URL without its own not-found page. */
export default function NotFound() {
  return <NotFoundContent />;
}
