'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Plus, X, ExternalLink, Eye, Search } from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';
import { slugify, type FaqItem } from '@/lib/blog';
import type { GlossaryTerm } from '@/lib/glossary';
import RichEditor from '@/app/admin/blog/RichEditor';

type Status = 'draft' | 'published';
interface TermRef { id: string; slug: string; term: string; category: string }

const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const input = 'w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0D1117] focus:border-[#F97316] focus:outline-none';
const label = 'block text-xs font-semibold uppercase tracking-wide text-[#8A96A8] mb-1.5';

function Box({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#E5E7EB] bg-white">
      <div className="border-b border-[#E5E7EB] px-4 py-2.5">
        <h2 className="text-sm font-bold text-[#0D1117]">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-[#8A96A8]">{hint}</p>}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

function Counter({ n, ideal }: { n: number; ideal: number }) {
  return <span className={`normal-case ${n > ideal ? 'text-amber-700' : ''}`}>({n}/{ideal})</span>;
}

export default function GlossaryEditor({ id }: { id?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!id);
  const [termId, setTermId] = useState<string | undefined>(id);
  const [initialHtml, setInitialHtml] = useState('');

  const [term, setTerm] = useState('');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(!!id);
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(!!id);
  const [definition, setDefinition] = useState('');
  const [html, setHtml] = useState('');
  const [category, setCategory] = useState('Investing Basics');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [related, setRelated] = useState<string[]>([]);
  const [relDraft, setRelDraft] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [status, setStatus] = useState<Status>('draft');
  const [publishAt, setPublishAt] = useState('');
  const [allTerms, setAllTerms] = useState<TermRef[]>([]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    adminFetch('/api/admin/glossary')
      .then(r => r.json())
      .then(d => { if (alive) setAllTerms(d.data ?? []); })
      .catch(() => {});
    if (id) {
      adminFetch(`/api/admin/glossary/${id}`)
        .then(async r => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error ?? 'Failed to load term');
          if (!alive) return;
          const t = d.data as GlossaryTerm;
          setTerm(t.term); setTitle(t.title); setSlug(t.slug); setDefinition(t.definition);
          setHtml(t.contentHtml); setInitialHtml(t.contentHtml); setCategory(t.category);
          setTags(t.tags); setRelated(t.related); setMetaDesc(t.metaDescription ?? '');
          setFaq(t.faq); setStatus(t.status); setPublishAt(toLocalInput(t.publishedAt));
          setLoading(false);
        })
        .catch(e => { if (alive) { setMsg({ type: 'err', text: e.message }); setLoading(false); } });
    }
    return () => { alive = false; };
  }, [id]);

  const categories = useMemo(
    () => [...new Set(['Investing Basics', 'Stock Market', 'Trading', 'Mutual Funds', 'Taxes', 'Economy', ...allTerms.map(t => t.category)])].sort(),
    [allTerms],
  );
  const bySlug = useMemo(() => new Map(allTerms.map(t => [t.slug, t])), [allTerms]);
  const relSuggestions = useMemo(() => {
    const q = relDraft.trim().toLowerCase();
    if (!q) return [];
    return allTerms
      .filter(t => t.slug !== slug && !related.includes(t.slug) && (t.term.toLowerCase().includes(q) || t.slug.includes(q)))
      .slice(0, 8);
  }, [relDraft, allTerms, related, slug]);

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/,$/, '').trim();
    if (t && !tags.includes(t) && tags.length < 15) setTags([...tags, t]);
    setTagDraft('');
  };
  const addRelated = (s: string) => {
    if (s && !related.includes(s) && related.length < 12) setRelated([...related, s]);
    setRelDraft('');
  };

  const save = async (nextStatus: Status) => {
    setSaving(true); setMsg(null);
    const body = {
      term, title: title || term, slug: slug || slugify(term), definition, contentHtml: html,
      metaDescription: metaDesc, category, tags, related, faq, status: nextStatus,
      publishedAt: nextStatus === 'published' && publishAt ? new Date(publishAt).toISOString() : null,
    };
    try {
      const r = await adminFetch(termId ? `/api/admin/glossary/${termId}` : '/api/admin/glossary', {
        method: termId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Save failed');
      setStatus(nextStatus);
      setSlug(d.data.slug);
      if (nextStatus === 'published' && !publishAt) setPublishAt(toLocalInput(new Date().toISOString()));
      setMsg({ type: 'ok', text: nextStatus === 'published' ? 'Saved and published.' : 'Draft saved.' });
      if (!termId) { setTermId(d.data.id); router.replace(`/admin/glossary/${d.data.id}`); }
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!termId || !window.confirm(`Delete "${term}" permanently? This cannot be undone.`)) return;
    const r = await adminFetch(`/api/admin/glossary/${termId}`, { method: 'DELETE' });
    if (!r.ok) { setMsg({ type: 'err', text: 'Could not delete the term.' }); return; }
    router.push('/admin/glossary');
  };

  const scheduled = status === 'published' && !!publishAt && new Date(publishAt).getTime() > openedAt;
  const live = status === 'published' && !scheduled;
  const seoTitle = title || term;
  const seoDesc = metaDesc || definition;

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#F97316]" /></div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#0D1117]">{termId ? 'Edit glossary term' : 'Add new glossary term'}</h1>
        <Link href="/admin/glossary" className="text-sm font-semibold text-[#EA580C] hover:underline">← All terms</Link>
      </div>
      {msg && (
        <div role="status" className={`mb-4 rounded-md px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <div>
            <label className={label} htmlFor="term">Term</label>
            <input id="term" value={term}
              onChange={e => {
                setTerm(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
                if (!titleTouched) setTitle(e.target.value);
              }}
              placeholder="e.g. P/E Ratio"
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-2xl font-bold text-[#0D1117] focus:border-[#F97316] focus:outline-none" />
          </div>
          <div>
            <label className={label} htmlFor="ttl">Page title (H1) <Counter n={seoTitle.length} ideal={60} /></label>
            <input id="ttl" value={title} onChange={e => { setTitle(e.target.value); setTitleTouched(true); }}
              placeholder="e.g. P/E Ratio: What It Means and How to Use It" maxLength={200} className={input} />
          </div>
          <Box title="Short definition" hint="One or two sentences. Shown on the A–Z list and used as the search snippet if no meta description is set.">
            <textarea value={definition} onChange={e => setDefinition(e.target.value)} rows={3} maxLength={600} className={input}
              placeholder="The price-to-earnings ratio compares a company's share price with its earnings per share." />
            <div className="text-right text-xs text-[#8A96A8]">{definition.length}/600</div>
          </Box>
          <RichEditor initialHtml={initialHtml} onChange={setHtml} />

          <Box title="FAQ" hint="Adds FAQ rich-result markup; helps answer engines.">
            {faq.map((f, i) => (
              <div key={i} className="space-y-2 rounded-md border border-[#E5E7EB] p-3">
                <input value={f.q} onChange={e => setFaq(faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} placeholder="Question" className={input} />
                <textarea value={f.a} onChange={e => setFaq(faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} rows={3} placeholder="Answer" className={input} />
                <button type="button" onClick={() => setFaq(faq.filter((_, j) => j !== i))} className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => setFaq([...faq, { q: '', a: '' }])} className="inline-flex items-center gap-1 text-sm font-semibold text-[#EA580C]">
              <Plus size={14} /> Add question
            </button>
          </Box>
        </div>

        <aside className="space-y-5">
          <Box title="Publish">
            <div className="text-sm text-[#4A5568]">
              Status: <strong className="text-[#0D1117]">{status === 'draft' ? 'Draft' : scheduled ? 'Scheduled' : 'Published'}</strong>
            </div>
            <div>
              <label className={label} htmlFor="pub">Publish date (optional, future = scheduled)</label>
              <input id="pub" type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)} className={input} />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" disabled={saving || !term.trim()} onClick={() => save('draft')}
                className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-semibold hover:border-[#F97316] disabled:opacity-50">
                Save draft
              </button>
              <button type="button" disabled={saving || !term.trim()} onClick={() => save('published')}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#F97316] px-3 py-2 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {status === 'published' ? 'Update' : 'Publish'}
              </button>
            </div>
            {termId && slug && (
              <Link href={`/glossary/${slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-[#EA580C] hover:underline">
                {live ? <><ExternalLink size={13} /> View term</> : <><Eye size={13} /> Preview</>}
              </Link>
            )}
            {termId && (
              <button type="button" onClick={remove} className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:underline">
                <Trash2 size={13} /> Delete term
              </button>
            )}
          </Box>

          <Box title="Category">
            <input list="gl-cats" value={category} onChange={e => setCategory(e.target.value)} className={input} />
            <datalist id="gl-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </Box>

          <Box title="Related terms" hint="Linked at the bottom of the page.">
            <div className="flex flex-wrap gap-1.5">
              {related.map(s => (
                <span key={s} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${bySlug.has(s) ? 'bg-[#FFF7ED] text-[#C2410C]' : 'bg-gray-100 text-gray-500'}`}
                  title={bySlug.has(s) ? undefined : 'No term with this URL exists yet'}>
                  {bySlug.get(s)?.term ?? s}
                  <button type="button" aria-label={`Remove ${s}`} onClick={() => setRelated(related.filter(x => x !== s))}><X size={11} /></button>
                </span>
              ))}
            </div>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A96A8]" />
              <input value={relDraft} onChange={e => setRelDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (relSuggestions[0]) addRelated(relSuggestions[0].slug); } }}
                placeholder="Find a term to link" className={`${input} pl-8`} aria-label="Find a related term" />
              {relSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[#E5E7EB] bg-white py-1 shadow-lg">
                  {relSuggestions.map(t => (
                    <li key={t.slug}>
                      <button type="button" onClick={() => addRelated(t.slug)} className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#FFF7ED]">
                        <span className="truncate text-[#0D1117]">{t.term}</span>
                        <span className="shrink-0 text-xs text-[#8A96A8]">{t.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Box>

          <Box title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#FFF7ED] px-2.5 py-0.5 text-xs text-[#C2410C]">
                  {t}
                  <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags(tags.filter(x => x !== t))}><X size={11} /></button>
                </span>
              ))}
            </div>
            <input value={tagDraft}
              onChange={e => { if (e.target.value.endsWith(',')) addTag(e.target.value); else setTagDraft(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagDraft); } }}
              onBlur={() => tagDraft && addTag(tagDraft)}
              placeholder="Type a tag, press Enter" className={input} />
          </Box>

          <Box title="SEO">
            <div>
              <label className={label} htmlFor="slug">URL slug</label>
              <input id="slug" value={slug} onChange={e => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} className={input} />
              {termId && live && <p className="mt-1 text-xs text-amber-700">Changing the slug of a live term changes its URL and can lose search ranking.</p>}
            </div>
            <div>
              <label className={label} htmlFor="md">Meta description <Counter n={seoDesc.length} ideal={160} /></label>
              <textarea id="md" value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={3} maxLength={320} placeholder={definition} className={input} />
            </div>
            <div className="rounded-md bg-[#F9FAFB] p-3">
              <div className="truncate text-xs text-[#4A5568]">scripwise.co.in › glossary › {slug || slugify(term) || '…'}</div>
              <div className="truncate text-[15px] font-medium text-[#1a0dab]">{seoTitle || 'Term title'} | Scripwise</div>
              <div className="line-clamp-2 text-xs text-[#4A5568]">{seoDesc || 'Meta description appears here.'}</div>
            </div>
          </Box>
        </aside>
      </div>
    </div>
  );
}
