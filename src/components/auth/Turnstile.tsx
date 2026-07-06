'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

interface Props {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback'?: () => void;
      }) => string;
    };
  }
}

/** Cloudflare Turnstile widget — free anti-spam CAPTCHA, no npm dependency. */
export default function Turnstile({ siteKey, onVerify, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  const render = () => {
    if (!containerRef.current || !window.turnstile || rendered.current) return;
    rendered.current = true;
    window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'expired-callback': onExpire,
    });
  };

  useEffect(() => {
    if (window.turnstile) render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={render}
      />
      <div ref={containerRef} />
    </>
  );
}
