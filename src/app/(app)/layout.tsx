import type { Metadata } from 'next';
import { headers } from 'next/headers';
import RootShell from '@/components/layout/RootShell';
import { baseMetadata } from '@/lib/siteMeta';

// Self-referencing canonical, stripped of query string, applied to every page in this group: a URL carrying
// tracking params (?ref=..., utm_*, etc.) canonicalizes to the clean path instead of being indexed on its own.
// These pages render per request (they need the CSP nonce and the visitor's preview cookie).
export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get('x-pathname') ?? '/';
  return { ...baseMetadata, alternates: { canonical: pathname } };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  return <RootShell nonce={h.get('x-nonce') ?? undefined} pathname={h.get('x-pathname') ?? '/'}>{children}</RootShell>;
}
