import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabase';

const MAX_BYTES = 5 * 1024 * 1024;

// Detect type from magic bytes rather than trusting the client-sent MIME type.
function sniff(b: Uint8Array): { ext: string; mime: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', mime: 'image/png' };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { ext: 'gif', mime: 'image/gif' };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return { ext: 'webp', mime: 'image/webp' };
  return null;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image must be 5 MB or smaller.' }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return NextResponse.json({ error: 'Only JPEG, PNG, WebP or GIF images are allowed.' }, { status: 415 });

  const client = getServiceClient();
  const path = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${kind.ext}`;
  const { error } = await client.storage.from('blog-images').upload(path, bytes, { contentType: kind.mime, cacheControl: '31536000' });
  if (error) return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  const { data } = client.storage.from('blog-images').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
