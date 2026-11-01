alter table public.blog_posts add column if not exists sources jsonb not null default '[]'::jsonb;
