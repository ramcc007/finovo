import Script from 'next/script';

const GA_ID = 'G-QN9RSNBE21';

// Both scripts load from an allowlisted src (googletagmanager.com, or our
// own origin for the bootstrap) rather than inline content. With
// 'strict-dynamic' in the CSP, host-based allowlisting alone isn't enough —
// the nonce is required for the browser to trust these regardless of host.
export default function GoogleAnalytics({ nonce }: { nonce?: string }) {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" nonce={nonce} />
      <Script src="/ga4-init.js" strategy="afterInteractive" nonce={nonce} />
    </>
  );
}
