-- Marks updates whose Senate/governor call has been read for the live map. Older updates are
-- checked in the background by the collector (see backfillCalls in src/lib/election/ingest.ts).
alter table public.election_updates add column if not exists calls_checked boolean not null default false;
create index if not exists election_updates_calls_unchecked_idx on public.election_updates (published_at desc) where calls_checked = false;
