-- Live US midterm elections page: timeline entries, dedupe memory, page state.
-- RLS is on with no public policies; everything goes through the service role.

create table if not exists public.election_updates (
  id uuid primary key default gen_random_uuid(),
  cluster_key text not null,
  headline text not null,
  summary text not null,
  market_impact text,
  market_regions text[] not null default '{}',
  tag text not null default 'other' check (tag in ('senate','house','governor','markets','other')),
  importance smallint not null default 3 check (importance between 1 and 5),
  sources jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now(),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists election_updates_published_idx on public.election_updates (published_at desc);
create index if not exists election_updates_cluster_idx on public.election_updates (cluster_key);

create table if not exists public.election_seen_items (
  url_hash text primary key,
  title_norm text not null,
  seen_at timestamptz not null default now()
);
create index if not exists election_seen_seen_at_idx on public.election_seen_items (seen_at desc);

create table if not exists public.election_meta (
  id int primary key default 1 check (id = 1),
  scoreboard jsonb not null default '{}'::jsonb,
  pending_scoreboard jsonb not null default '{}'::jsonb,
  takeaways jsonb not null default '[]'::jsonb,
  coverage_ended boolean not null default false,
  ended_at timestamptz,
  started_at timestamptz not null default now(),
  last_ingest_at timestamptz,
  last_error text,
  llm_calls_today int not null default 0,
  items_today int not null default 0,
  llm_day date
);
insert into public.election_meta (id) values (1) on conflict (id) do nothing;

alter table public.election_updates enable row level security;
alter table public.election_seen_items enable row level security;
alter table public.election_meta enable row level security;

alter table public.election_meta add column if not exists last_indexnow_at timestamptz;
