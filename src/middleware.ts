import { NextRequest, NextResponse } from 'next/server';

// Best-effort per-instance rate limiting (in-memory — not distributed across
// serverless instances, but meaningfully raises the bar against naive
// scripted abuse of the two unauthenticated, DB-expensive routes). For a
// hardened multi-instance setup, replace with @upstash/ratelimit + Vercel KV.
const RATE_LIMITED_PATHS = ['/api/screener', '/api/search'];
const WINDOW_MS = 10_000;
const MAX_REQUESTS = 30;
const buckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_REQUESTS) return false;
  bucket.count++;
  return true;
}

// Occasionally sweep expired entries so the map doesn't grow unbounded.
let lastSweep = Date.now();
function sweepBuckets() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (RATE_LIMITED_PATHS.some(p => pathname.startsWith(p))) {
    sweepBuckets();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(`${pathname}:${ip}`)) {
      return NextResponse.json({ error: 'Too many requests — please slow down.' }, { status: 429 });
    }
  }

  // Per-request CSP nonce — lets script-src drop 'unsafe-inline'. Next.js's
  // App Router streams RSC hydration data via genuinely inline <script>
  // tags (not just our own GA/Turnstile scripts), so there's no way to keep
  // 'unsafe-inline' out of script-src without nonces — Next.js's own docs
  // confirm this requires dynamic rendering (no static/ISR) site-wide, which
  // is the deliberate tradeoff being made here: an XSS payload can no longer
  // just inject a <script> tag and have it run, at the cost of losing static
  // generation. Next.js auto-applies this nonce to its own framework/page
  // scripts once it sees it in the CSP header; our own <Script> tags need it
  // passed explicitly via the `nonce` prop.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.google-analytics.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com",
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // No plugins/embeds anywhere in the app — block them outright rather than
    // relying on the default-src fallback (CSP evaluators flag a missing
    // object-src, and older engines don't always fall back).
    "object-src 'none'",
    // Belt-and-suspenders with HSTS: auto-upgrade any stray http:// subresource
    // so a single mixed-content reference can't open a downgrade/MITM window.
    "upgrade-insecure-requests",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
