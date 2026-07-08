import type { NextConfig } from "next";

// Content-Security-Policy is set per-request in src/middleware.ts instead of
// here, since it needs a fresh nonce on every response — Next.js's App
// Router streams RSC hydration data via genuinely inline <script> tags, so
// a static CSP can only ever choose 'unsafe-inline' (no protection against
// injected scripts) or a nonce (requires per-request generation).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
