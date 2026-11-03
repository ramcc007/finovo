import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse, after } from 'next/server';
import { pingIndexNow } from '@/lib/indexNow';
import { BLOG_TAG } from '@/lib/blogDb';
import { requireAdmin } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { parsePostInput, toRow } from '@/lib/blogSanitize';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await getServiceClient()
    .from('blog_posts')
    .select('id, slug, title, category, status, published_at, updated_at, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Failed to load posts.' }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = parsePostInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await getServiceClient()
    .from('blog_posts').insert(toRow(parsed.value)).select('id, slug').single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That URL slug is already used by another post.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to create post.' }, { status: 500 });
  }
  if (parsed.value.status === 'published') after(() => pingIndexNow([`/blog/${data.slug}`, '/blog', '/sitemap.xml']));
  revalidateTag(BLOG_TAG, { expire: 0 });
  return NextResponse.json({ data }, { status: 201 });
}
