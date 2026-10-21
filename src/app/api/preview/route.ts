import { NextRequest, NextResponse } from 'next/server';
import { anonPreviewRemainingMs } from '@/lib/entitlement';

export const dynamic = 'force-dynamic';

// Tells the client how long this anonymous visitor's free full-access window
// has left. The cookie is httpOnly, so the client can't read it directly.
export async function GET(req: NextRequest) {
  return NextResponse.json({ remainingMs: anonPreviewRemainingMs(req) });
}
