import RootShell from '@/components/layout/RootShell';
import { baseMetadata } from '@/lib/siteMeta';

// Content pages (blog, glossary, pricing, legal, contact). This layout does not read request headers, so pages in
// it can be cached. Each page sets its own canonical. The middleware sends these paths a CSP without a per-request
// nonce and does not set the preview cookie on them.
export const metadata = baseMetadata;

export default function StaticLayout({ children }: { children: React.ReactNode }) {
  return <RootShell pathname="/">{children}</RootShell>;
}
