import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isValidUserId } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { AUTHORS_TAG } from '@/lib/authorsDb';
import { BLOG_TAG } from '@/lib/blogDb';

const BUCKET = 'blog-images';
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 3 * 1024 * 1024;

/** Uploads an author photo to the public storage bucket and stores its URL. Send multipart: id, file. */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const id = String(form?.get('id') ?? '');
  const file = form?.get('file');
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image file.' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: 'Use a JPG, PNG or WebP image.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'The image must be under 3 MB.' }, { status: 400 });

  const db = getServiceClient();
  const { data: author } = await db.from('blog_authors').select('slug').eq('id', id).maybeSingle();
  if (!author) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const path = `authors/${author.slug}-${Date.now()}.${ext}`;
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true, cacheControl: '31536000' });
  if (upErr) return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await db.from('blog_authors').update({ photo_url: url, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
  revalidateTag(AUTHORS_TAG, { expire: 0 });
  revalidateTag(BLOG_TAG, { expire: 0 });
  return NextResponse.json({ url });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { error } = await getServiceClient().from('blog_authors').update({ photo_url: null, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
  revalidateTag(AUTHORS_TAG, { expire: 0 });
  revalidateTag(BLOG_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
