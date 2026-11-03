import { isGovUrl } from '@/lib/blogSanitize';
import type { LiveVideo, Media } from './types';

// Images are only loaded from hosts that publish free-licence pictures (credit required).
export const IMAGE_HOSTS = ['upload.wikimedia.org', 'images.unsplash.com', 'images.pexels.com'];

const YT_ID = /^[\w-]{11}$/;
const YT_CHANNEL = /^UC[\w-]{22}$/;

/** Reads a YouTube link: a single video, or a channel (whose current live stream is shown). */
export function parseYouTube(raw: string): { kind: 'video' | 'live'; id: string } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') { const id = u.pathname.slice(1, 12); return YT_ID.test(id) ? { kind: 'video', id } : null; }
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null;
  const v = u.searchParams.get('v');
  if (v && YT_ID.test(v)) return { kind: 'video', id: v };
  const m = u.pathname.match(/^\/(?:embed|live|shorts)\/([\w-]{11})(?:$|\/)/);
  if (m) return { kind: 'video', id: m[1] };
  const c = u.pathname.match(/^\/channel\/(UC[\w-]{22})/);
  if (c && YT_CHANNEL.test(c[1])) return { kind: 'live', id: c[1] };
  return null;
}

export const youtubeEmbedSrc = (kind: 'video' | 'live', id: string) =>
  kind === 'live'
    ? `https://www.youtube-nocookie.com/embed/live_stream?channel=${id}&autoplay=1&rel=0&modestbranding=1`
    : `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
export const youtubeWatchUrl = (kind: 'video' | 'live', id: string) =>
  kind === 'live' ? `https://www.youtube.com/channel/${id}/live` : `https://www.youtube.com/watch?v=${id}`;

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Validates media typed into the admin form. Returns null to clear it, or an error message. */
export function parseMedia(input: unknown): { ok: true; media: Media | null } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: true, media: null };
  const i = input as Record<string, unknown>;
  const url = text(i.url, 500);
  if (!url || i.type === 'none') return { ok: true, media: null };
  const credit = text(i.credit, 120);
  if (!credit) return { ok: false, error: 'Add a credit (who made the picture or video).' };
  let creditUrl = text(i.creditUrl, 500);
  if (creditUrl && (!/^https:\/\//i.test(creditUrl) || isGovUrl(creditUrl))) creditUrl = '';
  if (i.type === 'video') {
    const y = parseYouTube(url);
    if (!y || y.kind !== 'video') return { ok: false, error: 'Enter a YouTube video link.' };
    return { ok: true, media: { type: 'video', url: youtubeWatchUrl('video', y.id), videoId: y.id, credit, creditUrl: creditUrl || undefined } };
  }
  let host = '';
  try { const u = new URL(url); host = u.protocol === 'https:' ? u.hostname : ''; } catch { /* invalid */ }
  if (!IMAGE_HOSTS.includes(host)) return { ok: false, error: `Images must come from: ${IMAGE_HOSTS.join(', ')}.` };
  return { ok: true, media: { type: 'image', url, credit, creditUrl: creditUrl || undefined, alt: text(i.alt, 160) || undefined } };
}

/** "Watch live" list typed as lines of: YouTube link | title | credit. */
export function parseVideoLines(lines: unknown): { ok: true; videos: LiveVideo[] } | { ok: false; error: string } {
  const out: LiveVideo[] = [];
  for (const raw of Array.isArray(lines) ? lines : []) {
    const [link, title, credit] = String(raw).split('|').map(s => s.trim());
    if (!link) continue;
    const y = parseYouTube(link);
    if (!y) return { ok: false, error: `Not a YouTube video or channel link: ${link.slice(0, 60)}` };
    if (!title || !credit) return { ok: false, error: 'Each line needs: link | title | credit' };
    out.push({ kind: y.kind, id: y.id, title: title.slice(0, 100), credit: credit.slice(0, 80) });
  }
  return { ok: true, videos: out.slice(0, 3) };
}
