'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Plus, X, ExternalLink, Send } from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';
import { slugify, type FaqItem, type SourceItem, type Post } from '@/lib/blog';
import RichEditor from './RichEditor';

type Status = 'draft' | 'published';

// datetime-local value (browser local time) <-> ISO
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const input = 'w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0D1117] focus:border-[#F97316] focus:outline-none';
const label = 'block text-xs font-semibold uppercase tracking-wide text-[#8A96A8] mb-1.5';

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#E5E7EB] bg-white">
      <h2 className="border-b border-[#E5E7EB] px-4 py-2.5 text-sm font-bold text-[#0D1117]">{title}</h2>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}

export default function BlogEditor({ id }: { id?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!id);
  const [postId, setPostId] = useState<string | undefined>(id);
  const [initialHtml, setInitialHtml] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(!!id);
  const [html, setHtml] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('Market Insights');
  const [author, setAuthor] = useState('Admin');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [takeaways, setTakeaways] = useState('');
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [status, setStatus] = useState<Status>('draft');
  const [publishAt, setPublishAt] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [openedAt, setOpenedAt] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    adminFetch('/api/admin/blog')
      .then(r => r.json())
      .then(d => { if (alive) setCategories([...new Set((d.data ?? []).map((r: { category: string }) => r.category))] as string[]); })
      .catch(() => {});
    if (id) {
      adminFetch(`/api/admin/blog/${id}`)
        .then(async r => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error ?? 'Failed to load post');
          if (!alive) return;
          const p = d.data as Post;
          setTitle(p.title); setSlug(p.slug); setHtml(p.contentHtml); setInitialHtml(p.contentHtml);
          setExcerpt(p.excerpt); setCategory(p.category); setAuthor(p.author); setTags(p.tags);
          setMetaTitle(p.metaTitle ?? ''); setMetaDesc(p.metaDescription ?? '');
          setTakeaways(p.keyTakeaways.join('\n')); setFaq(p.faq); setSources(p.sources ?? []); setStatus(p.status);
          setPublishAt(toLocalInput(p.publishedAt));
          setLoading(false);
        })
        .catch(e => { if (alive) { setMsg({ type: 'err', text: e.message }); setLoading(false); } });
    }
    return () => { alive = false; };
  }, [id]);

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/,$/, '').trim();
    if (t && !tags.includes(t) && tags.length < 15) setTags([...tags, t]);
    setTagDraft('');
  };

  const save = async (nextStatus: Status, publishNowAt?: string) => {
    setSaving(true); setMsg(null);
    const body = {
      title, slug: slug || slugify(title), excerpt, contentHtml: html, metaTitle, metaDescription: metaDesc,
      category, author, tags, status: nextStatus,
      publishedAt: publishNowAt ?? (nextStatus === 'published' && publishAt ? new Date(publishAt).toISOString() : null),
      keyTakeaways: takeaways.split('\n').map(s => s.trim()).filter(Boolean),
      faq, sources,
    };
    try {
      const r = await adminFetch(postId ? `/api/admin/blog/${postId}` : '/api/admin/blog', {
        method: postId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Save failed');
      setStatus(nextStatus);
      setSlug(d.data.slug);
      if (publishNowAt) {
        setPublishAt(toLocalInput(publishNowAt));
        setOpenedAt(Date.now()); // status now reads Published, not Scheduled
      } else if (nextStatus === 'published' && !publishAt) setPublishAt(toLocalInput(new Date().toISOString()));
      setMsg({ type: 'ok', text: publishNowAt ? 'Published now. It is live.' : nextStatus === 'published' ? 'Saved and published.' : 'Draft saved.' });
      if (!postId) { setPostId(d.data.id); router.replace(`/admin/blog/${d.data.id}`); }
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!postId || !window.confirm(`Delete "${title}" permanently? This cannot be undone.`)) return;
    const r = await adminFetch(`/api/admin/blog/${postId}`, { method: 'DELETE' });
    if (!r.ok) { setMsg({ type: 'err', text: 'Could not delete the post.' }); return; }
    router.push('/admin/blog');
  };

  const scheduled = status === 'published' && publishAt && new Date(publishAt).getTime() > openedAt;
  const seoTitle = metaTitle || title;
  const seoDesc = metaDesc || excerpt;
  const liveUrl = useMemo(() => `scripwise.co.in › blog › ${slug || slugify(title) || '…'}`, [slug, title]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#F97316]" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#0D1117]">{postId ? 'Edit post' : 'Add new post'}</h1>
        <Link href="/admin/blog" className="text-sm font-semibold text-[#EA580C] hover:underline">← All posts</Link>
      </div>
      {msg && (
        <div className={`mb-4 rounded-md px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-5 min-w-0">
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }}
            placeholder="Add title"
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-2xl font-bold text-[#0D1117] focus:border-[#F97316] focus:outline-none"
          />
          <RichEditor initialHtml={initialHtml} onChange={setHtml} />

          <Box title="Excerpt">
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} maxLength={400}
              placeholder="Short summary shown on the blog list" className={input} />
          </Box>

          <Box title="Key takeaways (shown in a highlighted box; one per line, **bold** supported)">
            <textarea value={takeaways} onChange={e => setTakeaways(e.target.value)} rows={5} className={input} />
          </Box>

          <Box title="Sources & credits (shown at the bottom; list where the facts came from)">
            {sources.map((s, i) => (
              <div key={i} className="grid gap-2 rounded-md border border-[#E5E7EB] p-3 sm:grid-cols-[1fr_2fr_auto]">
                <input value={s.name} onChange={e => setSources(sources.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Name, e.g. AMFI" maxLength={80} className={input} />
                <input value={s.url} onChange={e => setSources(sources.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="https://www.amfiindia.com" className={input} />
                <button type="button" onClick={() => setSources(sources.filter((_, j) => j !== i))} className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
              </div>
            ))}
            {sources.length < 8 && (
              <button type="button" onClick={() => setSources([...sources, { name: '', url: 'https://' }])} className="inline-flex items-center gap-1 text-sm font-semibold text-[#EA580C]">
                <Plus size={14} /> Add source
              </button>
            )}
          </Box>

          <Box title="FAQ (helps answer engines; adds FAQ rich-result markup)">
            {faq.map((f, i) => (
              <div key={i} className="rounded-md border border-[#E5E7EB] p-3 space-y-2">
                <input value={f.q} onChange={e => setFaq(faq.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} placeholder="Question" className={input} />
                <textarea value={f.a} onChange={e => setFaq(faq.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} rows={3} placeholder="Answer" className={input} />
                <button type="button" onClick={() => setFaq(faq.filter((_, j) => j !== i))} className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => setFaq([...faq, { q: '', a: '' }])} className="inline-flex items-center gap-1 text-sm font-semibold text-[#EA580C]">
              <Plus size={14} /> Add question
            </button>
          </Box>
        </div>

        {/* Sidebar */}
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
              <button type="button" disabled={saving || !title.trim()} onClick={() => save('draft')}
                className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-semibold hover:border-[#F97316] disabled:opacity-50">
                Save draft
              </button>
              <button type="button" disabled={saving || !title.trim()} onClick={() => save('published')}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#F97316] px-3 py-2 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {status === 'published' ? 'Update' : 'Publish'}
              </button>
            </div>
            {scheduled && (
              <button type="button" disabled={saving || !title.trim()}
                onClick={() => { if (window.confirm('Publish now instead of on the scheduled date? Your current edits are saved too, and it goes live immediately with today\'s date.')) save('published', new Date().toISOString()); }}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#F97316] px-3 py-2 text-sm font-semibold text-[#EA580C] hover:bg-[#FFF7ED] disabled:opacity-50">
                <Send size={14} /> Publish now
              </button>
            )}
            {status === 'published' && slug && (
              <Link href={`/blog/${slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#EA580C] hover:underline">
                <ExternalLink size={13} /> View post
              </Link>
            )}
            {postId && (
              <button type="button" onClick={remove} className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:underline">
                <Trash2 size={13} /> Delete post
              </button>
            )}
          </Box>

          <Box title="Author">
            <input value={author} onChange={e => setAuthor(e.target.value)} maxLength={80} className={input} />
          </Box>

          <Box title="Category">
            <input list="blog-cats" value={category} onChange={e => setCategory(e.target.value)} className={input} />
            <datalist id="blog-cats">
              {[...new Set(['Market Insights', 'Investing Basics', 'Stock Screening', ...categories])].map(c => <option key={c} value={c} />)}
            </datalist>
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
            <input
              value={tagDraft}
              onChange={e => { if (e.target.value.endsWith(',')) addTag(e.target.value); else setTagDraft(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagDraft); } }}
              onBlur={() => tagDraft && addTag(tagDraft)}
              placeholder="Type a tag, press Enter" className={input}
            />
          </Box>

          <Box title="SEO">
            <div>
              <label className={label} htmlFor="slug">URL slug</label>
              <input id="slug" value={slug} onChange={e => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} className={input} />
              {postId && status === 'published' && <p className="mt-1 text-xs text-amber-700">Changing the slug of a live post changes its URL and can lose search ranking.</p>}
            </div>
            <div>
              <label className={label} htmlFor="mt">Meta title <span className="normal-case">({seoTitle.length}/60)</span></label>
              <input id="mt" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder={title} maxLength={120} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="md">Meta description <span className="normal-case">({seoDesc.length}/160)</span></label>
              <textarea id="md" value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={3} placeholder={excerpt} maxLength={320} className={input} />
            </div>
            <div className="rounded-md bg-[#F9FAFB] p-3">
              <div className="text-xs text-[#4A5568] truncate">{liveUrl}</div>
              <div className="text-[15px] font-medium text-[#1a0dab] truncate">{seoTitle || 'Post title'} | Scripwise</div>
              <div className="text-xs text-[#4A5568] line-clamp-2">{seoDesc || 'Meta description appears here.'}</div>
            </div>
          </Box>
        </aside>
      </div>
    </div>
  );
}
