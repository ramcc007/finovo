-- Race calls for the live election map. One row per (race, outlet); the displayed result is worked out
-- in code (two agreeing top outlets = called). race_overrides holds admin corrections.
create table if not exists public.election_race_reports (
  chamber text not null check (chamber in ('senate','governor')),
  state char(2) not null,
  source_name text not null,
  party text not null check (party in ('D','R','I')),
  status text not null check (status in ('called','leading')),
  url text not null,
  reported_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (chamber, state, source_name)
);
alter table public.election_race_reports enable row level security;
create index if not exists election_race_reports_state_idx on public.election_race_reports (chamber, state);
alter table public.election_meta add column if not exists race_overrides jsonb not null default '{}'::jsonb;
