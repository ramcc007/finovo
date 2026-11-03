import { createHash } from 'node:crypto';
import { isGovUrl } from '@/lib/blogSanitize';
import type { Feed } from './config';

export interface RawItem {
  feed: string;
  source: string; // publisher name shown as the credit
  title: string;
  url: string;
  snippet: string; // used for the rewrite only, never stored
  publishedAt: string; // ISO
}

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&');
const stripTags = (s: string) => decode(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const pick = (block: string, tag: string) => block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'))?.[1];

export function parseFeed(xml: string, feed: Feed): RawItem[] {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  const out: RawItem[] = [];
  for (const b of blocks.slice(0, 40)) {
    let title = stripTags(pick(b, 'title') ?? '');
    const linkText = pick(b, 'link');
    const url = decode((linkText && linkText.trim()) || b.match(/<link[^>]*href="([^"]+)"/i)?.[1] || '').trim();
    const date = pick(b, 'pubDate') ?? pick(b, 'published') ?? pick(b, 'updated') ?? pick(b, 'dc:date');
    const t = date ? Date.parse(decode(date).trim()) : NaN;
    if (!title || !/^https?:\/\//i.test(url) || Number.isNaN(t)) continue;

    // Google News puts the publisher in <source> and at the end of the title ("Headline - Publisher").
    let source = stripTags(pick(b, 'source') ?? '');
    if (feed.name === 'Google News') {
      const m = title.match(/^(.*\S)\s+-\s+([^-]{2,40})$/);
      if (m) { title = m[1]; source = source || m[2].trim(); }
    }
    out.push({
      feed: feed.name, source: source || feed.name, title, url,
      snippet: stripTags(pick(b, 'description') ?? pick(b, 'summary') ?? '').slice(0, 320),
      publishedAt: new Date(t).toISOString(),
    });
  }
  return out;
}

export async function fetchFeed(feed: Feed): Promise<RawItem[]> {
  try {
    const r = await fetch(feed.url, {
      headers: { 'User-Agent': 'ScripwiseNewsBot/1.0 (+https://www.scripwise.co.in/us-midterm-elections)', Accept: 'application/rss+xml, application/atom+xml, text/xml' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!r.ok) return [];
    return parseFeed(await r.text(), feed).filter(i => !isGovUrl(i.url));
  } catch {
    return [];
  }
}

export function urlHash(url: string): string {
  let key = url;
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|oc$|ref$|cmp$|ito$)/i.test(k)) u.searchParams.delete(k);
    u.hash = '';
    key = u.toString();
  } catch { /* keep raw */ }
  return createHash('sha1').update(key).digest('hex');
}

const STOP = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'to', 'for', 'and', 'as', 'at', 'by', 'is', 'are', 'was', 'be', 'with', 'after', 'from', 'says', 'say', 'new', 'live', 'updates']);
export function titleTokens(title: string): string[] {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
}
export const titleNorm = (title: string) => titleTokens(title).join(' ');

export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  return inter / (sa.size + sb.size - inter);
}
