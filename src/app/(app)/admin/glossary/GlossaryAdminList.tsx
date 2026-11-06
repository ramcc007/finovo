'use client';

import AdminGate from '@/components/blog/AdminGate';
import ContentAdminList, { type ContentListConfig } from '@/components/admin/ContentAdminList';

const CONFIG: ContentListConfig = {
  heading: 'Glossary terms',
  noun: 'term',
  apiPath: '/api/admin/glossary',
  publicPath: '/glossary',
  newHref: '/admin/glossary/new',
  newLabel: 'Add new term',
  editHref: id => `/admin/glossary/${id}`,
  searchPlaceholder: 'Search term, URL or category',
  titleLabel: 'Term',
  defaultSort: 'title', // a glossary reads best A–Z
  mapRow: r => ({
    id: String(r.id), slug: String(r.slug), title: String(r.term ?? r.title), category: String(r.category),
    status: r.status as 'draft' | 'published', published_at: (r.published_at as string | null) ?? null,
    updated_at: String(r.updated_at), created_at: String(r.created_at),
  }),
};

export default function GlossaryAdminList() {
  return <AdminGate><ContentAdminList config={CONFIG} /></AdminGate>;
}
