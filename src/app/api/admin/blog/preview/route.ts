import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { COLS, toPost, type Row } from '@/lib/blogDb';
import { sanitizeContent } from '@/lib/blogSanitize';

/** Admin-only: a post by slug whatever its status or date, so scheduled posts and drafts can be previewed at their real URL. */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const slug = (req.nextUrl.searchParams.get('slug') ?? '').trim();
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data } = await getServiceClient().from('blog_posts').select(COLS).eq('slug', slug).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const post = toPost(data as Row);
  return NextResponse.json({ data: { ...post, contentHtml: sanitizeContent(post.contentHtml) } }, { headers: { 'cache-control': 'no-store' } });
}
