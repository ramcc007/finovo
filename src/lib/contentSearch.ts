// Small ranked text search shared by the glossary and blog search boxes (pure, client and server safe).

export interface SearchDoc { href: string; title: string; sub: string; tag: string; extra?: string }

export function scoreDoc(d: SearchDoc, query: string): number {
  const q = query.toLowerCase();
  const t = d.title.toLowerCase();
  if (t.startsWith(q)) return 0;
  if (t.includes(q)) return 1;
  if (`${d.tag} ${d.extra ?? ''}`.toLowerCase().includes(q)) return 2;
  if (d.sub.toLowerCase().includes(q)) return 3;
  return 99;
}

export function searchDocs(docs: SearchDoc[], query: string, limit = 50): SearchDoc[] {
  const q = query.trim().toLowerCase().slice(0, 60);
  if (q.length < 2) return [];
  return docs.map(d => ({ d, s: scoreDoc(d, q) })).filter(x => x.s < 99).sort((a, b) => a.s - b.s || a.d.title.localeCompare(b.d.title)).slice(0, limit).map(x => x.d);
}
