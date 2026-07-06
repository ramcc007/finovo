import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Market-wide upcoming/recent corporate actions, joined with company name.
// Defaults to a window around today so the page reads like an events feed
// rather than a full historical dump.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const type = (p.get('type') ?? '').slice(0, 30);
  const daysBack = Math.min(365, Math.max(0, +(p.get('days_back') ?? 7) || 7));
  const daysFwd = Math.min(365, Math.max(0, +(p.get('days_fwd') ?? 60) || 60));

  const from = new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0];
  const to = new Date(Date.now() + daysFwd * 86400000).toISOString().split('T')[0];

  try {
    let query = supabase
      .from('corporate_actions')
      .select('id, symbol, action_type, ex_date, record_date, purpose, companies!inner(name, sector)')
      .gte('ex_date', from)
      .lte('ex_date', to)
      .order('ex_date', { ascending: true })
      .limit(300);

    if (type) query = query.eq('action_type', type);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []).map(r => {
      const company = Array.isArray(r.companies) ? r.companies[0] : r.companies;
      return {
        id: r.id,
        symbol: r.symbol,
        name: company?.name ?? r.symbol,
        sector: company?.sector ?? null,
        action_type: r.action_type,
        ex_date: r.ex_date,
        record_date: r.record_date,
        purpose: r.purpose,
      };
    });

    return NextResponse.json({ data: rows });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
