'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'scripwise-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const dismiss = (choice: 'accepted' | 'declined') => {
    window.localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-[#E2E8F0] bg-white shadow-[0_-2px_12px_rgba(16,24,40,0.08)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p className="text-xs text-[#4A5568] leading-relaxed flex-1">
          We use essential cookies only, to remember things like your selected filters and
          watchlist. We don&apos;t use tracking or advertising cookies.{' '}
          <Link href="/privacy" className="font-semibold text-[#0D1117] underline underline-offset-2">
            Privacy Policy
          </Link>
        </p>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => dismiss('declined')}
            className="flex-1 sm:flex-none text-xs font-medium px-4 py-2 rounded-[6px] border border-[#E2E8F0] text-[#4A5568] hover:border-[#F97316] hover:text-[#F97316] transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => dismiss('accepted')}
            className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 rounded-[6px] bg-[#F97316] text-white hover:bg-[#EA580C] transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
