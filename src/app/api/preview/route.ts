import { NextRequest, NextResponse } from 'next/server';
import { ANON_PREVIEW_MS, anonPreviewRemainingMs } from '@/lib/entitlement';

export const dynamic = 'force-dynamic';

const RESET_COOKIE = 'sw_anon_reset';
// The one-time "Reset timer" comes back this long after it was used.
const RESET_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** True while this visitor's last reset is still inside the 7-day cooldown.
 *  The cookie holds the time of the reset, so the rule is enforced from that
 *  timestamp rather than from the cookie's own expiry. Older cookies that
 *  only held "1" (the previous 1-year version) count as expired. */
function resetUsed(req: NextRequest): boolean {
  const usedAt = Number(req.cookies.get(RESET_COOKIE)?.value);
  return Number.isFinite(usedAt) && usedAt > 1_000_000_000_000 && Date.now() - usedAt < RESET_COOLDOWN_MS;
}

// Tells the client how long this anonymous visitor's free full-access window
// has left, and whether their reset is available. Both cookies are httpOnly,
// so the client can't read them directly.
export async function GET(req: NextRequest) {
  return NextResponse.json({
    remainingMs: anonPreviewRemainingMs(req),
    canReset: !resetUsed(req),
  });
}

// Restart of the window once it has ended, at most once per 7 days. The "used" marker outlives the
// session-scoped window cookie, so it survives a browser restart.
export async function POST(req: NextRequest) {
  if (resetUsed(req)) {
    return NextResponse.json({ error: 'Reset already used.' }, { status: 409 });
  }
  // Only once the current 30 minutes have run out.
  if (anonPreviewRemainingMs(req) > 0) {
    return NextResponse.json({ error: 'Your free preview is still running.' }, { status: 409 });
  }
  const now = Date.now();
  const res = NextResponse.json({ remainingMs: ANON_PREVIEW_MS, canReset: false });
  res.cookies.set('sw_anon_since', String(now), { path: '/', sameSite: 'lax', httpOnly: true });
  res.cookies.set(RESET_COOKIE, String(now), {
    path: '/', sameSite: 'lax', httpOnly: true, maxAge: RESET_COOLDOWN_MS / 1000,
  });
  return res;
}
