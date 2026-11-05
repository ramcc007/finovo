-- Which stocks belong to which headline index, for the tabs on /markets.
-- Filled by scripts/ingest_index_members.py (weekly workflow). Public read, like quotes and indices.
create table if not exists public.index_members (
  index_key text not null check (index_key in ('sensex','nifty50','midcap100','smallcap100')),
  symbol text not null,
  updated_at timestamptz not null default now(),
  primary key (index_key, symbol)
);
alter table public.index_members enable row level security;
drop policy if exists "Public read index_members" on public.index_members;
create policy "Public read index_members" on public.index_members for select using (true);
