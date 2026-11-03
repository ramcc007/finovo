import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { COLS, toPost, type Row } from '@/lib/blogDb';
import { sanitizeContent } from '@/lib/blogSanitize';
import { liveInternalPaths, unlinkNotLive } from '@/lib/liveLinks';
import { enhanceContent } from '@/lib/enhance';
import { getPublishedTerms } from '@/lib/glossaryDb';

/** Admin-only: a post by slug whatever its status or date, so scheduled posts and drafts can be previewed at their real URL. */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const slug = (req.nextUrl.searchParams.get('slug') ?? '').trim();
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data } = await getServiceClient().from('blog_posts').select(COLS).eq('slug', slug).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const post = toPost(data as Row);
  // The same pipeline as the live page: links to pages that are not live become text, and the
  // reading aids (hover cards for live glossary terms, section anchors) are added.
  const [live, terms] = await Promise.all([liveInternalPaths(), getPublishedTerms()]);
  const aids = enhanceContent(unlinkNotLive(sanitizeContent(post.contentHtml), live), {
    glossary: terms.map(t => ({ slug: t.slug, term: t.term, definition: t.definition })),
  });
  return NextResponse.json(
    { data: { ...post, contentHtml: aids.html, toc: aids.toc } },
    { headers: { 'cache-control': 'no-store' } },
  );
}
