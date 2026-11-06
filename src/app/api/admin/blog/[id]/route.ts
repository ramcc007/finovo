import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse, after } from 'next/server';
import { pingIndexNow } from '@/lib/indexNow';
import { publishNow } from '@/lib/publishNow';
import { requireAdmin } from '@/lib/adminAuth';
import { isValidUserId } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { parsePostInput, toRow } from '@/lib/blogSanitize';
import { COLS, toPost, type Row, BLOG_TAG } from '@/lib/blogDb';
import { getStaticPosts } from '@/lib/staticBlog';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data } = await getServiceClient().from('blog_posts').select(COLS).eq('id', id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: toPost(data as Row) });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const parsed = parsePostInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await getServiceClient()
    .from('blog_posts').update(toRow(parsed.value)).eq('id', id).select('id, slug').maybeSingle();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That URL slug is already used by another post.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to save post.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  revalidateTag(BLOG_TAG, { expire: 0 }); revalidatePath('/blog', 'layout');
  if (parsed.value.status === 'published') after(() => pingIndexNow([`/blog/${data.slug}`, '/blog', '/sitemap.xml']));
  return NextResponse.json({ data });
}

// {"action":"publish_now"} makes a scheduled item live immediately.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (body?.action !== 'publish_now') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  const res = await publishNow('blog_posts', id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  revalidateTag(BLOG_TAG, { expire: 0 }); revalidatePath('/blog', 'layout');
  after(() => pingIndexNow([`/blog/${res.slug}`, '/blog', '/sitemap.xml']));
  return NextResponse.json({ data: { id, slug: res.slug } });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const client = getServiceClient();
  const { data: row } = await client.from('blog_posts').select('slug').eq('id', id).maybeSingle();
  const { error } = await client.from('blog_posts').delete().eq('id', id);
  // A file-based post with the same slug would otherwise reappear — hide it too.
  if (!error && row && getStaticPosts().some(p => p.slug === row.slug)) {
    await client.from('blog_hidden_slugs').upsert({ slug: row.slug });
  }
  if (error) return NextResponse.json({ error: 'Failed to delete post.' }, { status: 500 });
  revalidateTag(BLOG_TAG, { expire: 0 }); revalidatePath('/blog', 'layout');
  return NextResponse.json({ ok: true });
}
