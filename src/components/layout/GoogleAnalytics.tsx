import Script from 'next/script';
import GaRouteGuard from './GaRouteGuard';

export const GA_ID = 'G-QN9RSNBE21';

const isAdminPath = (p: string) => p === '/admin' || p.startsWith('/admin/');

// Both scripts load from an allowlisted src (googletagmanager.com, or our
// own origin for the bootstrap) rather than inline content. With
// 'strict-dynamic' in the CSP, host-based allowlisting alone isn't enough —
// the nonce is required for the browser to trust these regardless of host.
//
// Admin pages are never tracked: opened directly, the scripts aren't loaded
// at all; reached by in-app navigation, GaRouteGuard sets Google's
// documented opt-out flag so no hits are sent while on /admin.
export default function GoogleAnalytics({ nonce, pathname }: { nonce?: string; pathname: string }) {
  if (isAdminPath(pathname)) return null;
  return (
    <>
      <GaRouteGuard id={GA_ID} />
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" nonce={nonce} />
      <Script src="/ga4-init.js" strategy="afterInteractive" nonce={nonce} />
    </>
  );
}
