// Reading aids added when an article or glossary page is shown. They change how the text looks, never the
// words: one bold key figure per section, a pull quote, glossary hover cards, heading anchors for the
// "In this article" list, and a "Numbers in this article" box. Works on the sanitised content HTML
// (p, h2, h3, ul, ol, li, blockquote, a, strong, em only).

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
  const re = /<(p|h2|h3|h4|ul|ol|blockquote|pre|hr)\b([^>]*)>([\s\S]*?)<\/\1>|<hr\b[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!m[1]) out.push({ tag: 'hr', open: m[0], inner: '', close: '' });
    else out.push({ tag: m[1], open: `<${m[1]}${m[2]}>`, inner: m[3], close: `</${m[1]}>` });
  }
  return out;
}
const join = (bs: Block[]) => bs.map(b => b.open + b.inner + b.close).join('\n');

// Replaces the first match of `re` that sits in plain text (not inside a tag, a link, bold text or a hover card).
function wrapFirst(html: string, re: RegExp, wrap: (match: string) => string): string | null {
  const parts = html.split(/(<[^>]+>)/);
  let blocked = 0; // depth inside <a>, <strong>/<b> or a hover card
  const spans: boolean[] = []; // for each open <span>: does it block?
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith('<')) {
      if (/^<(a|strong|b)\b/i.test(p)) blocked++;
      else if (/^<\/(a|strong|b)>/i.test(p)) blocked = Math.max(0, blocked - 1);
      else if (/^<span\b/i.test(p)) {
        const b = /class="gloss"/.test(p);
        spans.push(b);
        if (b) blocked++;
      } else if (/^<\/span>/i.test(p)) {
        if (spans.pop()) blocked = Math.max(0, blocked - 1);
      }
      continue;
    }
    if (blocked) continue;
    const m = p.match(re);
    if (!m || m.index === undefined) continue;
    parts[i] = p.slice(0, m.index) + wrap(m[0]) + p.slice(m.index + m[0].length);
    return parts.join('');
  }
  return null;
}

function termVariants(term: string): string[] {
  const out = new Set<string>([term.trim()]);
  const paren = term.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    out.add(paren[1].trim());
    out.add(paren[2].trim());
  }
  return [...out].filter(v => v.length >= 3 && !/\band\b/i.test(v)).sort((a, b) => b.length - a.length);
}

function termRegex(variant: string): RegExp {
  const esc = escapeHtml(variant).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const acronym = /^[A-Z0-9&/+-]{2,6}$/.test(variant);
  return new RegExp(`(?<![\\w-])${esc}(?![\\w-])`, acronym ? '' : 'i');
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

  // Glossary hover cards: the first mention of each live glossary term, up to a limit, never in headings.
  const max = opts.maxTerms ?? 6;
  let added = 0;
  const linked = new Set(Array.from(html.matchAll(/href="\/glossary\/([^"#?]+)"/g), m => m[1]));
  for (const g of (opts.glossary ?? []).slice().sort((a, b) => b.term.length - a.term.length)) {
    if (added >= max) break;
    if (g.slug === opts.selfSlug || linked.has(g.slug) || !g.definition) continue;
    let done = false;
    const res = termVariants(g.term).map(termRegex);
    // The earliest mention in the article, whichever form of the term it uses.
    for (const b of bs) {
      if (b.tag !== 'p' && b.tag !== 'ul' && b.tag !== 'ol') continue;
      for (const re of res) {
        const next = wrapFirst(
          b.inner,
          re,
          m =>
            `<span class="gloss" tabindex="0"><span class="gloss-term">${m}</span><span class="gloss-pop" role="tooltip"><span class="gloss-def">${escapeHtml(g.definition)}</span> <a href="/glossary/${g.slug}">Read the full meaning</a></span></span>`,
        );
        if (next) {
          b.inner = next;
          done = true;
          break;
        }
      }
      if (done) break;
    }
    if (done) added++;
  }

  let out = join(bs);
  if (quote && quoteAfter >= 0) {
    const anchor = join(bs.slice(0, quoteAfter + 1));
    const aside = `\n<aside class="pull-quote" aria-hidden="true"><p>${escapeHtml(quote.text)}</p>${quote.cite ? `<span class="pull-cite">${escapeHtml(quote.cite)}</span>` : ''}</aside>`;
    out = anchor + aside + out.slice(anchor.length);
  }
  return { html: out, toc, numbers: numbers.length >= 3 ? numbers : [], quote };
}
