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

// Content pages that can be cached: no per-request nonce, no cookie (a Set-Cookie header keeps a response out of the
// CDN cache). They live in the (static) route group. Scripts there are allowed with 'unsafe-inline' instead of a
// nonce, because Next.js inlines its page data as scripts and a fixed page cannot carry a fresh nonce.
const STATIC_PREFIXES = ['/blog', '/glossary', '/stocks', '/pricing', '/disclaimer', '/privacy', '/terms', '/refund', '/contact'];
const isStaticContent = (p: string) => STATIC_PREFIXES.some(s => p === s || p.startsWith(s + '/'));

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
  const staticContent = isStaticContent(pathname);
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = [
    "default-src 'self'",
    staticContent
      ? "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://checkout.razorpay.com"
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://www.googletagmanager.com https://checkout.razorpay.com`,
    "style-src 'self' 'unsafe-inline'",
    // upload.wikimedia.org, images.unsplash.com and images.pexels.com: credited free-licence pictures on the
    // election page. i.ytimg.com: video thumbnails for the click-to-play YouTube player.
    "img-src 'self' data: blob: https://www.google-analytics.com https://*.razorpay.com https://upload.wikimedia.org https://images.unsplash.com https://images.pexels.com https://i.ytimg.com https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com https://*.razorpay.com https://lumberjack.razorpay.com",
    "frame-src https://challenges.cloudflare.com https://api.razorpay.com https://checkout.razorpay.com https://www.youtube-nocookie.com",
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

  if (staticContent) {
    const res = NextResponse.next();
    res.headers.set('Content-Security-Policy', csp);
    return res;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // Query-string-free path, read by the root layout to set a self-referencing
  // canonical tag (see generateMetadata in layout.tsx) — so a URL carrying
  // tracking params (?ref=..., utm_*, etc.) always canonicalizes to the clean
  // path instead of getting indexed as its own separate page.
  requestHeaders.set('x-pathname', pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  // Anchors the anonymous 60-minute full-access preview window (see
  // anonPreviewRemainingMs in lib/entitlement.ts). No Max-Age — a real session
  // cookie, so it clears when the browser closes and a fresh visit gets its
  // own fresh preview rather than the clock persisting indefinitely.
  if (!request.cookies.get('sw_anon_since')) {
    response.cookies.set('sw_anon_since', String(Date.now()), {
      path: '/', sameSite: 'lax', httpOnly: true,
    });
  }

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
