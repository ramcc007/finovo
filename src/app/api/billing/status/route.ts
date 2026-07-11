import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getEntitlement } from '@/lib/entitlement';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ent = await getEntitlement(req);
  if (!ent.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getServiceClient();
  const { data: sub } = await client
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', ent.userId)
    .maybeSingle();

  return NextResponse.json({
    plan: ent.plan,
    active: ent.active,
    status: sub?.status ?? 'inactive',
    currentPeriodEnd: sub?.current_period_end ?? null,
  });
}
