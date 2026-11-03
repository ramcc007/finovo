// Reading aids added when an article or glossary page is shown. They change how the text looks, never the
// words: one bold key figure per section, a pull quote, glossary hover cards, heading anchors for the
// "In this article" list, and a "Numbers in this article" box. Works on the sanitised content HTML
// (p, h2, h3, ul, ol, li, blockquote, table, a, strong, em only).

export interface GlossaryRef { slug: string; term: string; definition: string }
export interface TocItem { id: string; text: string }
export interface NumberItem { figure: string; text: string; id: string }
export interface PullQuote { text: string; cite?: string }
export interface Enhanced { html: string; toc: TocItem[]; numbers: NumberItem[]; quote: PullQuote | null }

const FIGURE =
  /(?:Rs\.?\s?|₹\s?)\d[\d,]*(?:\.\d+)?(?:\s(?:lakh crore|lakh|crore|billion|million|trillion))?|\d[\d,]*(?:\.\d+)?\s?%|\b\d[\d,]*(?:\.\d+)?\s(?:lakh crore|lakh|crore|billion|million|bps|basis points)\b/;

const decode = (s: string) =>
  s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section';
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const sentencesOf = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z0-9"“₹])/).map(s => s.trim()).filter(Boolean);

interface Block { tag: string; open: string; inner: string; close: string }

function blocks(html: string): Block[] {
  const out: Block[] = [];
  const re = /<(p|h2|h3|h4|ul|ol|blockquote|pre|table|hr)\b([^>]*)>([\s\S]*?)<\/\1>|<hr\b[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!m[1]) out.push({ tag: 'hr', open: m[0], inner: '', close: '' });
    else out.push({ tag: m[1], open: `<${m[1]}${m[2]}>`, inner: m[3], close: `</${m[1]}>` });
  }
  return out;
}
const join = (bs: Block[]) => bs.map(b => b.open + b.inner + b.close).join('\n');

// Text positions where a hover card may go: plain text, not inside a link, bold text, code, an existing
// hover card or a quotation ("..." or “...”). Returns the html split into tags and text parts, and for each
// text part the [start, end) ranges that are allowed.
interface Scan { parts: string[]; open: Array<Array<[number, number]>> }

function scan(html: string): Scan {
  const parts = html.split(/(<[^>]+>)/);
  const open: Array<Array<[number, number]>> = [];
  let blocked = 0; // depth inside <a>, <strong>/<b>, <code> or a hover card
  const spans: boolean[] = []; // for each open <span>: does it block?
  let inQuote = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    open.push([]);
    if (p.startsWith('<')) {
      if (/^<(a|strong|b|code|button)\b/i.test(p)) blocked++;
      else if (/^<\/(a|strong|b|code|button)>/i.test(p)) blocked = Math.max(0, blocked - 1);
      else if (/^<span\b/i.test(p)) {
        const b = /class="gloss/.test(p);
        spans.push(b);
        if (b) blocked++;
      } else if (/^<\/span>/i.test(p)) {
        if (spans.pop()) blocked = Math.max(0, blocked - 1);
      }
      continue;
    }
    let from = 0;
    const ranges = open[i];
    const re = /“|”|"|&quot;/g;
    let q: RegExpExecArray | null;
    while ((q = re.exec(p))) {
      if (!inQuote && !blocked && q.index > from) ranges.push([from, q.index]);
      inQuote = q[0] === '“' ? true : q[0] === '”' ? false : !inQuote;
      from = q.index + q[0].length;
    }
    if (!inQuote && !blocked && from < p.length) ranges.push([from, p.length]);
  }
  return { parts, open };
}

interface Hit { part: number; index: number; length: number }

/** The earliest allowed match of any of `res` (longest wins at the same spot). */
function firstHit(sc: Scan, res: RegExp[]): Hit | null {
  for (let i = 0; i < sc.parts.length; i++) {
    let best: Hit | null = null;
    for (const [a, b] of sc.open[i]) {
      const seg = sc.parts[i].slice(a, b);
      for (const re of res) {
        const m = re.exec(seg);
        if (!m) continue;
        const h = { part: i, index: a + m.index, length: m[0].length };
        if (!best || h.index < best.index || (h.index === best.index && h.length > best.length)) best = h;
      }
      if (best) return best;
    }
  }
  return null;
}

function wrapAt(sc: Scan, h: Hit, wrap: (match: string) => string): string {
  const p = sc.parts[h.part];
  const parts = sc.parts.slice();
  parts[h.part] = p.slice(0, h.index) + wrap(p.slice(h.index, h.index + h.length)) + p.slice(h.index + h.length);
  return parts.join('');
}

// Replaces the first match of `re` that sits in plain text (not inside a tag, a link, bold text or a hover card).
function wrapFirst(html: string, re: RegExp, wrap: (match: string) => string): string | null {
  const sc = scan(html);
  const h = firstHit(sc, [re]);
  return h ? wrapAt(sc, h, wrap) : null;
}

// Extra spellings for terms whose everyday forms differ from the glossary title. Matched against the
// term (lower case, without any bracketed part). Two-letter forms are only allowed from this list.
const ALIASES: Array<[RegExp, string[]]> = [
  [/^(pe|p\/e|price[\s-]to[\s-]earnings)(\s+ratio)?$/, ['P/E ratio', 'P/E', 'PE ratio', 'price to earnings ratio', 'price to earnings', 'price-earnings ratio']],
  [/^(pb|p\/b|price[\s-]to[\s-]book)(\s+(ratio|value))?$/, ['P/B ratio', 'P/B', 'PB ratio', 'price to book ratio', 'price to book', 'price-to-book value']],
  [/^debt[\s-]to[\s-]equity(\s+ratio)?$/, ['debt to equity ratio', 'debt to equity', 'D/E ratio', 'D/E']],
  [/^market\s+capitali[sz]ation$/, ['market capitalisation', 'market capitalization', 'market cap']],
  [/^t\+1(\s+settlement)?$/, ['T+1 settlement', 'T+1']],
  [/^(f&o|futures\s+(and|&)\s+options)$/, ['F&O', 'futures and options', 'futures & options']],
  [/^(roe|return\s+on\s+equity)$/, ['ROE', 'return on equity']],
  [/^(roce|return\s+on\s+capital\s+employed)$/, ['ROCE', 'return on capital employed']],
  [/^(eps|earnings\s+per\s+share)$/, ['EPS', 'earnings per share']],
  [/^(ev\/ebitda|ev\s+to\s+ebitda)$/, ['EV/EBITDA', 'EV to EBITDA']],
];

const isAcronym = (v: string) => /^[A-Z0-9&/+-]{2,6}$/.test(v) && /[A-Z]/.test(v);

interface Variant { text: string; listed: boolean }

/** Every form of a glossary term that counts as a mention: the term itself, the parts of "X (Y)", the parts
 *  of "X and Y" / "X, Y and Z" / "X vs Y", singulars of plural terms, and the listed extra spellings. */
export function termAliases(term: string): string[] {
  return termVariants(term).map(v => v.text);
}

function termVariants(term: string): Variant[] {
  const out = new Map<string, Variant>();
  const add = (v: string, listed = false) => {
    const t = v.trim().replace(/\s+/g, ' ');
    if (!t) return;
    const k = t.toLowerCase();
    const prev = out.get(k);
    if (!prev || (listed && !prev.listed)) out.set(k, { text: t, listed: listed || !!prev?.listed });
  };
  const bases: string[] = [term];
  const paren = term.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) bases.push(paren[1], paren[2]);
  for (const base of bases) {
    add(base);
    const parts = base.split(/\s*,\s*(?:and\s+)?|\s+(?:and|&|vs\.?|versus)\s+/i).map(x => x.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const words = parts.map(x => x.split(/\s+/));
    const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
    for (let i = 0; i < parts.length; i++) {
      const w = words[i];
      // A lone common word ("Low", "Options") is too loose to count as a mention on its own.
      if (w.length > 1 || isAcronym(parts[i])) add(parts[i]);
      // "52-Week High and Low" -> "52-Week Low"; "ASM and GSM Framework" -> "ASM Framework".
      if (w.length < longest.length && i === parts.length - 1) add([...longest.slice(0, longest.length - w.length), ...w].join(' '));
      if (w.length < longest.length && i < parts.length - 1) add([...w, ...longest.slice(w.length)].join(' '));
      if (isAcronym(w[0]) && w.length > 1) add(w[0]);
    }
  }
  // "Penny Stocks" -> "Penny Stock" (plurals of the singular are handled by the regex).
  for (const v of [...out.values()]) {
    const ws = v.text.split(' ');
    const last = ws[ws.length - 1];
    if (ws.length > 1 && !isAcronym(last) && /[^s]s$/i.test(last) && last.length > 3) add([...ws.slice(0, -1), last.slice(0, -1)].join(' '));
  }
  const key = (paren ? paren[1] : term).trim().toLowerCase().replace(/\s+/g, ' ');
  for (const [re, list] of ALIASES) if (re.test(key) || (paren && re.test(paren[2].trim().toLowerCase()))) list.forEach(a => add(a, true));
  return [...out.values()]
    .filter(v => (v.listed ? v.text.length >= 2 : v.text.length >= 3))
    .sort((a, b) => b.text.length - a.text.length);
}

function termRegex(variant: string): RegExp {
  const esc = escapeHtml(variant)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/(?:\\s|\s|-)+/g, '[\\s-]+'); // "debt to equity" == "debt-to-equity"
  const acronym = isAcronym(variant);
  const lastWord = variant.split(/\s+/).pop() ?? '';
  // Plurals: ETFs, IPO's; dividends, taxes. Not for terms that already end in s.
  const plural = acronym || isAcronym(lastWord) ? "(?:s|'s|’s)?" : /s$/i.test(variant) ? '' : '(?:s|es)?';
  return new RegExp(`(?<![\\w-])${esc}${plural}(?![\\w-])`, acronym ? '' : 'i');
}

export function enhanceContent(
  html: string,
  opts: { glossary?: GlossaryRef[]; selfSlug?: string; maxTerms?: number } = {},
): Enhanced {
  const bs = blocks(html);
  if (!bs.length) return { html, toc: [], numbers: [], quote: null };

  // Heading anchors for the "In this article" list.
  const toc: TocItem[] = [];
  const used = new Set<string>();
  for (const b of bs) {
    if (b.tag !== 'h2') continue;
    const text = textOf(b.inner);
    let id = slugify(text);
    for (let n = 2; used.has(id); n++) id = `${slugify(text)}-${n}`;
    used.add(id);
    b.open = `<h2 id="${id}">`;
    toc.push({ id, text });
  }

  // Numbers in this article: up to 4 short sentences with a figure, from different paragraphs, in order.
  const numbers: NumberItem[] = [];
  const seenFig = new Set<string>();
  bs.forEach((b, i) => {
    if (numbers.length >= 4 || b.tag !== 'p') return;
    for (const s of sentencesOf(textOf(b.inner))) {
      const m = s.match(FIGURE);
      if (!m || seenFig.has(m[0]) || words(s) > 34 || words(s) < 6) continue;
      const clause = s.split(/[;:]\s|,\s(?=(?:while|whereas|and|but)\b)/).find(c => c.includes(m[0])) ?? s;
      const text = words(clause) >= 6 ? clause.replace(/[,;:]$/, '') : s;
      const id = `fig-${i}`;
      b.open = b.open.replace(/^<p\b[^>]*>/, `<p id="${id}">`);
      numbers.push({ figure: m[0].trim(), text: text.endsWith('.') || text.endsWith('?') ? text : `${text}.`, id });
      seenFig.add(m[0]);
      break;
    }
  });

  // Pull quote: a quote from a named person if there is one, otherwise a sentence from the middle of the piece.
  let quote: PullQuote | null = null;
  let quoteAfter = -1;
  const paras = bs.map((b, i) => ({ b, i })).filter(x => x.b.tag === 'p');
  for (const { b, i } of paras) {
    const t = textOf(b.inner);
    // "Name, title, said, “quote”" or "“quote,” said Name"
    const a = t.match(/(?:^|\.\s)([A-Z][^.“”"]{2,100}?),?\s(?:said|says|told [^,]{2,40}|added|wrote)[,:]?\s[“"]([^”"]{40,260})[”"]/);
    const b2 = a ? null : t.match(/[“"]([^”"]{40,260})[,.]?[”"],?\s(?:said|says|added)\s([A-Z][^.,]{2,90})/);
    if (a) quote = { text: a[2].trim(), cite: a[1].trim() };
    else if (b2) quote = { text: b2[1].trim(), cite: b2[2].trim() };
    if (quote) {
      quoteAfter = i;
      break;
    }
  }
  if (!quote && paras.length >= 6) {
    const mid = paras.slice(Math.floor(paras.length * 0.35), Math.ceil(paras.length * 0.7));
    outer: for (const { b, i } of mid) {
      if (/<a\b/.test(b.inner)) continue;
      for (const s of sentencesOf(textOf(b.inner))) {
        if (words(s) >= 14 && words(s) <= 32 && !/^(However|Alongside|This|That|These|It|They)\b/.test(s)) {
          quote = { text: s };
          quoteAfter = i;
          break outer;
        }
      }
    }
  }

  // One bold key figure per section (the first figure in the section's first paragraph that has one).
  let inSection = true;
  let boldDone = false;
  for (const b of bs) {
    if (b.tag === 'h2') {
      inSection = true;
      boldDone = false;
      continue;
    }
    if (!inSection || boldDone || b.tag !== 'p' || /<strong\b/.test(b.inner)) continue;
    const next = wrapFirst(b.inner, new RegExp(FIGURE.source), m => `<strong class="kf">${m}</strong>`);
    if (next) {
      b.inner = next;
      boldDone = true;
    }
  }

  // Glossary hover cards: the first mention of each live glossary term, in reading order, up to a limit.
  // Only in paragraphs and lists (never headings, quotes, code, tables or links), never for the page's own
  // term or a term the text already links to.
  const max = opts.maxTerms ?? 6;
  const linked = new Set(Array.from(html.matchAll(/href="(?:https:\/\/(?:www\.)?scripwise\.co\.in)?\/glossary\/([^"#?/]+)/g), m => m[1]));
  let pending = (opts.glossary ?? [])
    .filter(g => g.slug !== opts.selfSlug && !linked.has(g.slug) && g.definition)
    .map(g => ({ g, res: termVariants(g.term).map(v => termRegex(v.text)) }));
  let added = 0;
  for (const b of bs) {
    if (added >= max || !pending.length) break;
    if (b.tag !== 'p' && b.tag !== 'ul' && b.tag !== 'ol') continue;
    // Repeatedly take the earliest remaining mention in this block.
    for (;;) {
      if (added >= max) break;
      const sc = scan(b.inner);
      let best: { hit: Hit; k: number } | null = null;
      pending.forEach((c, k) => {
        const hit = firstHit(sc, c.res);
        if (!hit) return;
        if (!best || hit.part < best.hit.part || (hit.part === best.hit.part && (hit.index < best.hit.index || (hit.index === best.hit.index && hit.length > best.hit.length)))) best = { hit, k };
      });
      if (!best) break;
      const { hit, k } = best as { hit: Hit; k: number };
      const g = pending[k].g;
      const id = `gp-${added + 1}`;
      b.inner = wrapAt(sc, hit, m =>
        `<span class="gloss"><button type="button" class="gloss-term" aria-expanded="false" aria-controls="${id}">${m}</button>` +
        `<span class="gloss-pop" id="${id}" hidden><span class="gloss-def">${escapeHtml(g.definition)}</span> ` +
        `<a href="/glossary/${g.slug}">Read the full meaning<span class="sr-only"> of ${escapeHtml(g.term)}</span></a>` +
        `<button type="button" class="gloss-close" aria-label="Close">×</button></span></span>`,
      );
      pending = pending.filter((_, i) => i !== k);
      added++;
    }
  }

  // Wide tables scroll sideways inside their own box instead of widening the page.
  for (const b of bs) {
    if (b.tag !== 'table') continue;
    b.open = `<div class="table-wrap" role="region" aria-label="Table" tabindex="0">${b.open}`;
    b.close = `${b.close}</div>`;
  }

  let out = join(bs);
  if (quote && quoteAfter >= 0) {
    const anchor = join(bs.slice(0, quoteAfter + 1));
    const aside = `\n<aside class="pull-quote" aria-hidden="true"><p>${escapeHtml(quote.text)}</p>${quote.cite ? `<span class="pull-cite">${escapeHtml(quote.cite)}</span>` : ''}</aside>`;
    out = anchor + aside + out.slice(anchor.length);
  }
  return { html: out, toc, numbers: numbers.length >= 3 ? numbers : [], quote };
}
