import type { Metadata } from 'next';
import RootShell from '@/components/layout/RootShell';
import NotFound from '@/components/layout/NotFoundContent';

export const metadata: Metadata = { title: 'Page not found', robots: { index: false, follow: true } };

/** 404 for any URL that matches no route. It needs its own html shell because the site has two root layouts. */
export default function GlobalNotFound() {
  return <RootShell pathname="/"><NotFound /></RootShell>;
}
