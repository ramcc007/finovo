'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Route-level error boundary: without this, any client render error bubbles
// to Next.js's bare global error screen ("This page couldn't load"), which
// reads like a network failure and offers no way back into the app.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-[#F4F6FA] px-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold text-[#0D1117] mb-2">Something went wrong</h1>
        <p className="text-sm text-[#4A5568] mb-6">
          An unexpected error occurred while rendering this page. You can retry,
          or head back to the explorer.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="text-sm font-semibold px-5 py-2 rounded-[6px] bg-[#F97316] text-white hover:bg-[#EA580C] transition-colors"
          >
            Try again
          </button>
          <Link
            href="/screener"
            className="text-sm font-medium px-5 py-2 rounded-[6px] border border-[#E2E8F0] text-[#4A5568] hover:border-[#F97316] hover:text-[#F97316] transition-colors"
          >
            Open Explorer
          </Link>
        </div>
      </div>
    </div>
  );
}
