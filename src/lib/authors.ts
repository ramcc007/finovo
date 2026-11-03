// Shared (client + server safe) author types and helpers.

export interface AuthorLinks { x?: string; linkedin?: string; website?: string }

export interface Author {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  location: string;
  photoUrl: string | null;
  beats: string[];
  links: AuthorLinks;
  updatedAt: string;
}

/** Same formula as the database seed, so a byline maps to its page without a lookup. */
export const authorSlug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const authorHref = (name: string) => `/blog/author/${authorSlug(name)}`;
export const initials = (name: string) => name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const LINK_HOSTS: Record<keyof AuthorLinks, RegExp> = {
  x: /^(www\.)?(x|twitter)\.com$/i, linkedin: /^([a-z]{2,3}\.)?linkedin\.com$/i, website: /./,
};

export interface AuthorInput { role: string; bio: string; location: string; beats: string[]; links: AuthorLinks }

/** Validates the admin form. Name and slug are not editable here: they come from the byline. */
export function parseAuthorInput(input: unknown): { ok: true; value: AuthorInput } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Bad request' };
  const i = input as Record<string, unknown>;
  const bio = typeof i.bio === 'string' ? i.bio.trim().slice(0, 1200) : '';
  const beats = (Array.isArray(i.beats) ? i.beats : []).map(b => text(b, 40)).filter(Boolean).slice(0, 6);
  const links: AuthorLinks = {};
  const rawLinks = (i.links && typeof i.links === 'object' ? i.links : {}) as Record<string, unknown>;
  for (const k of ['x', 'linkedin', 'website'] as const) {
    const v = text(rawLinks[k], 300);
    if (!v) continue;
    let u: URL;
    try { u = new URL(v.startsWith('http') ? v : `https://${v}`); } catch { return { ok: false, error: `The ${k} link is not a valid address.` }; }
    if (u.protocol !== 'https:' || !LINK_HOSTS[k].test(u.hostname)) return { ok: false, error: `The ${k} link must be an https ${k === 'website' ? 'address' : `${k}.com address`}.` };
    links[k] = u.toString();
  }
  return { ok: true, value: { role: text(i.role, 80), bio, location: text(i.location, 80), beats, links } };
}
