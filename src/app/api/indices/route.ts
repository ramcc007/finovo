import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('indices')
      .select('symbol, name, last, change, change_pct, volume, rank, updated_at')
      .order('rank', { ascending: true });
    if (error) throw error;

    const tradeDate = data?.[0]?.updated_at ?? null;
    return NextResponse.json({ indices: data ?? [], tradeDate });
  } catch {
    return NextResponse.json({ indices: [], tradeDate: null });
  }
}
