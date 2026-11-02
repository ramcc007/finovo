import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await getServiceClient()
    .from('glossary_terms')
    .select('id, slug, term, title, category, status, published_at, updated_at, created_at')
    .order('term', { ascending: true });
  if (error) return NextResponse.json({ error: 'Failed to load terms.' }, { status: 500 });
  return NextResponse.json({ data }, { headers: { 'cache-control': 'no-store' } });
}
