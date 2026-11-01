-- Slugs of file-based posts (src/content/blog) the admin has deleted. The
-- file stays in the repo, but the post is no longer served or listed.
create table if not exists public.blog_hidden_slugs (
  slug text primary key,
  hidden_at timestamptz not null default now()
);
alter table public.blog_hidden_slugs enable row level security;
