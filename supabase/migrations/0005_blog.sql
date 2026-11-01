-- Blog posts managed from the admin UI. RLS is enabled with no policies:
-- only the service-role key (server routes) can read or write.
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content_html text not null default '',
  meta_title text,
  meta_description text,
  category text not null default 'Market Insights',
  tags text[] not null default '{}',
  featured_image text,
  author text not null default 'Admin',
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  key_takeaways jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  reading_minutes int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.blog_posts enable row level security;
create index if not exists blog_posts_status_published_idx on public.blog_posts (status, published_at desc);

-- Public bucket for blog images (reads are public; writes only via service role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images', 'blog-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
