import { NextRequest, NextResponse } from 'next/server';
import { ANON_PREVIEW_MS, anonPreviewRemainingMs } from '@/lib/entitlement';

export const dynamic = 'force-dynamic';

const RESET_COOKIE = 'sw_anon_reset';

// Tells the client how long this anonymous visitor's free full-access window
// has left, and whether their one-time reset is still available. Both cookies
// are httpOnly, so the client can't read them directly.
export async function GET(req: NextRequest) {
  return NextResponse.json({
    remainingMs: anonPreviewRemainingMs(req),
    canReset: !req.cookies.get(RESET_COOKIE),
  });
}

// One-time restart of the window. The "used" marker is a long-lived cookie
// (unlike the session-scoped window cookie), so it survives a browser restart
// and the offer can't be re-claimed each session.
export async function POST(req: NextRequest) {
  if (req.cookies.get(RESET_COOKIE)) {
    return NextResponse.json({ error: 'Reset already used.' }, { status: 409 });
  }
  const res = NextResponse.json({ remainingMs: ANON_PREVIEW_MS, canReset: false });
  res.cookies.set('sw_anon_since', String(Date.now()), { path: '/', sameSite: 'lax', httpOnly: true });
  res.cookies.set(RESET_COOKIE, '1', {
    path: '/', sameSite: 'lax', httpOnly: true, maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
