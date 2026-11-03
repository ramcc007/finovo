-- Blog authors: one row per byline, edited from /admin/authors and shown at /blog/author/<slug>.
create table if not exists public.blog_authors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  role text not null default '',
  bio text not null default '',
  location text not null default '',
  photo_url text,
  beats text[] not null default '{}',
  links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.blog_authors enable row level security;

-- One row per byline already in use, so every author page exists from day one.
insert into public.blog_authors (slug, name)
select lower(regexp_replace(trim(author), '[^a-zA-Z0-9]+', '-', 'g')), trim(author)
from (select distinct author from public.blog_posts where author is not null and trim(author) <> '') a
on conflict (name) do nothing;
