'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const GA_ID = 'G-QN9RSNBE21';
const CONSENT_KEY = 'scripwise-cookie-consent';
export const CONSENT_CHANGE_EVENT = 'scripwise-cookie-consent-change';

// Only loads GA4 once the user has accepted the cookie banner — the banner
// promises no tracking cookies until then, so this must not fire earlier.
export default function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const check = () => setEnabled(window.localStorage.getItem(CONSENT_KEY) === 'accepted');
    check();
    window.addEventListener(CONSENT_CHANGE_EVENT, check);
    window.addEventListener('storage', check);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, check);
      window.removeEventListener('storage', check);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
