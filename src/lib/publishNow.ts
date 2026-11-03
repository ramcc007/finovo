import { getServiceClient } from '@/lib/supabaseServer';

export type PublishNowResult =
  | { ok: true; slug: string }
  | { ok: false; status: number; error: string };

// Moves a scheduled row's publish time to now so it goes live immediately.
// Only touches rows that are published with a future date, so a draft or an
// already-live item (and its original publish date) is never changed.
export async function publishNow(table: 'blog_posts' | 'glossary_terms', id: string): Promise<PublishNowResult> {
  const nowIso = new Date().toISOString();
  const client = getServiceClient();
  const { data, error } = await client
    .from(table)
    .update({ published_at: nowIso, updated_at: nowIso })
    .eq('id', id).eq('status', 'published').gt('published_at', nowIso)
    .select('slug').maybeSingle();
  if (error) return { ok: false, status: 500, error: 'Failed to publish.' };
  if (data) return { ok: true, slug: data.slug as string };
  const { data: row } = await client.from(table).select('status').eq('id', id).maybeSingle();
  if (!row) return { ok: false, status: 404, error: 'Not found' };
  return { ok: false, status: 409, error: row.status === 'draft' ? 'This is a draft, not a scheduled item.' : 'This is already live.' };
}
