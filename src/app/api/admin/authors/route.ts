import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse, after } from 'next/server';
import { requireAdmin, isValidUserId } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { pingIndexNow } from '@/lib/indexNow';
import { parseAuthorInput } from '@/lib/authors';
import { AUTHORS_TAG, AUTHOR_COLS, toAuthor, type AuthorRow } from '@/lib/authorsDb';
import { BLOG_TAG } from '@/lib/blogDb';

const noStore = { headers: { 'cache-control': 'no-store' } };

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getServiceClient();
  const [{ data: rows, error }, { data: posts }] = await Promise.all([
    db.from('blog_authors').select(AUTHOR_COLS).order('name'),
    db.from('blog_posts').select('author, status'),
  ]);
  if (error) return NextResponse.json({ error: 'Failed to load authors.' }, { status: 500 });
  const counts: Record<string, number> = {};
  for (const p of posts ?? []) if (p.status === 'published') counts[p.author] = (counts[p.author] ?? 0) + 1;
  return NextResponse.json({ data: ((rows ?? []) as AuthorRow[]).map(r => ({ ...toAuthor(r), posts: counts[r.name] ?? 0 })) }, noStore);
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null) as { id?: unknown } | null;
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const parsed = parseAuthorInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;
  const { data, error } = await getServiceClient().from('blog_authors')
    .update({ role: v.role, bio: v.bio, location: v.location, beats: v.beats, links: v.links, updated_at: new Date().toISOString() })
    .eq('id', id).select('slug').maybeSingle();
  if (error) return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  revalidateTag(AUTHORS_TAG, { expire: 0 });
  revalidateTag(BLOG_TAG, { expire: 0 }); // article pages embed the author
  after(() => pingIndexNow([`/blog/author/${data.slug}`]));
  return NextResponse.json({ ok: true });
}
