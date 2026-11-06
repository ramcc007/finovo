'use client';

import AdminGate from '@/components/blog/AdminGate';
import ContentAdminList, { type ContentListConfig } from '@/components/admin/ContentAdminList';

const CONFIG: ContentListConfig = {
  heading: 'Blog posts',
  noun: 'post',
  apiPath: '/api/admin/blog',
  publicPath: '/blog',
  newHref: '/admin/blog/new',
  editHref: id => `/admin/blog/${id}`,
  searchPlaceholder: 'Search title, URL or category',
  defaultSort: 'date_desc',
};

export default function BlogAdminList() {
  return <AdminGate><ContentAdminList config={CONFIG} /></AdminGate>;
}
