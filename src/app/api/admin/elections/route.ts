import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse, after } from 'next/server';
import { requireAdmin, isValidUserId } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { pingIndexNow } from '@/lib/indexNow';
import { ELECTION_TAG, META_COLS, UPDATE_COLS, toMeta, toUpdate, type UpdateRow } from '@/lib/election/db';
import { MAX_AI_CALLS_PER_DAY } from '@/lib/election/config';
import { cleanText } from '@/lib/election/style';
import { parseMedia, parseVideoLines } from '@/lib/election/media';
import { PAGE_PATH, type Chamber, type ScoreEntry, type Scoreboard } from '@/lib/election/types';

const CHAMBERS: Chamber[] = ['senate', 'house', 'governors'];
const REGIONS = ['US', 'EU', 'India'];
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1000 ? v : null);
const noStore = { headers: { 'cache-control': 'no-store' } };

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getServiceClient();
  const [{ data: meta }, { data: rows }] = await Promise.all([
    db.from('election_meta').select(`${META_COLS}, llm_day`).eq('id', 1).maybeSingle(),
    db.from('election_updates').select(UPDATE_COLS).order('published_at', { ascending: false }).limit(300),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const m = meta ? toMeta(meta as never) : null;
  if (m && (meta as { llm_day: string | null }).llm_day !== today) { m.llmCallsToday = 0; m.itemsToday = 0; }
  return NextResponse.json({ meta: m, updates: ((rows ?? []) as UpdateRow[]).map(toUpdate), aiCap: MAX_AI_CALLS_PER_DAY }, noStore);
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.action !== 'string') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const db = getServiceClient();
  const done = () => { revalidateTag(ELECTION_TAG, { expire: 0 }); return NextResponse.json({ ok: true }); };

  switch (body.action) {
    case 'update_item': {
      const id = String(body.id ?? '');
      if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof body.hidden === 'boolean') patch.hidden = body.hidden;
      if (typeof body.importance === 'number') patch.importance = Math.min(5, Math.max(1, Math.round(body.importance)));
      if (typeof body.headline === 'string' && body.headline.trim()) patch.headline = cleanText(body.headline).slice(0, 160);
      if (typeof body.summary === 'string' && body.summary.trim()) patch.summary = cleanText(body.summary).slice(0, 600);
      if ('marketImpact' in body) {
        const v = typeof body.marketImpact === 'string' ? cleanText(body.marketImpact).slice(0, 280) : '';
        patch.market_impact = v || null;
        if (!v) patch.market_regions = [];
      }
      if ('media' in body) {
        const m = parseMedia(body.media);
        if (!m.ok) return NextResponse.json({ error: m.error }, { status: 400 });
        patch.media = m.media;
      }
      if (Array.isArray(body.marketRegions)) patch.market_regions = body.marketRegions.filter(r => typeof r === 'string' && REGIONS.includes(r));
      const { error } = await db.from('election_updates').update(patch).eq('id', id);
      return error ? NextResponse.json({ error: 'Could not save.' }, { status: 500 }) : done();
    }
    case 'approve_scoreboard':
    case 'reject_scoreboard': {
      const { data } = await db.from('election_meta').select('scoreboard, pending_scoreboard').eq('id', 1).single();
      const board = { ...(data?.scoreboard as Scoreboard ?? {}) };
      const pending = { ...(data?.pending_scoreboard as Scoreboard ?? {}) };
      const only = CHAMBERS.find(c => c === body.chamber);
      for (const c of only ? [only] : CHAMBERS) {
        if (!pending[c]) continue;
        if (body.action === 'approve_scoreboard') board[c] = pending[c];
        delete pending[c];
      }
      await db.from('election_meta').update({ scoreboard: board, pending_scoreboard: pending }).eq('id', 1);
      return done();
    }
    case 'set_scoreboard': {
      const chamber = CHAMBERS.find(c => c === body.chamber);
      if (!chamber) return NextResponse.json({ error: 'Unknown chamber' }, { status: 400 });
      const { data } = await db.from('election_meta').select('scoreboard').eq('id', 1).single();
      const board = { ...(data?.scoreboard as Scoreboard ?? {}) };
      if (body.clear === true) delete board[chamber];
      else {
        const e: ScoreEntry = {
          d: num(body.d), r: num(body.r), other: num(body.other), uncalled: num(body.uncalled),
          source: typeof body.source === 'string' ? cleanText(body.source).slice(0, 80) : undefined, updatedAt: new Date().toISOString(),
        };
        if (e.d === null || e.r === null) return NextResponse.json({ error: 'Enter the Democrat and Republican counts.' }, { status: 400 });
        board[chamber] = e;
      }
      await db.from('election_meta').update({ scoreboard: board }).eq('id', 1);
      return done();
    }
    case 'set_takeaways': {
      const list = (Array.isArray(body.takeaways) ? body.takeaways : []).map(x => cleanText(String(x))).filter(Boolean).slice(0, 6);
      await db.from('election_meta').update({ takeaways: list }).eq('id', 1);
      return done();
    }
    case 'set_auto': {
      await db.from('election_meta').update({ auto_publish: body.enabled !== false }).eq('id', 1);
      return done();
    }
    case 'remove_projection': {
      const { data } = await db.from('election_meta').select('projections').eq('id', 1).single();
      const list = Array.isArray(data?.projections) ? data.projections as { chamber: string; kind: string; by: string }[] : [];
      const next = list.filter(p => !(p.chamber === body.chamber && p.kind === body.kind && p.by === body.by));
      await db.from('election_meta').update({ projections: next }).eq('id', 1);
      return done();
    }
    case 'set_videos': {
      const v = parseVideoLines(body.lines);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      await db.from('election_meta').update({ videos: v.videos }).eq('id', 1);
      return done();
    }
    case 'set_coverage': {
      const ended = body.ended === true;
      await db.from('election_meta').update({ coverage_ended: ended, ended_at: ended ? new Date().toISOString() : null }).eq('id', 1);
      if (ended) after(() => pingIndexNow([PAGE_PATH, `${PAGE_PATH}/feed.xml`, '/sitemap.xml']));
      return done();
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!isValidUserId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { error } = await getServiceClient().from('election_updates').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete.' }, { status: 500 });
  revalidateTag(ELECTION_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
