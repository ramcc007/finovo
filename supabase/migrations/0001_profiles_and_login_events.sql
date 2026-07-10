-- Profiles + login_events were referenced by the app but never actually
-- existed in the database, so profile-name saves and the audit log silently
-- failed. This creates them with owner-scoped RLS, plus a signup trigger that
-- populates profiles from the metadata signup already collects — wrapped so a
-- profile-insert failure can NEVER block a registration.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  city text,
  investor_profile text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('sign_up','sign_in','sign_out')),
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.login_events enable row level security;

drop policy if exists "login_events_insert_own" on public.login_events;
drop policy if exists "login_events_select_own" on public.login_events;
create policy "login_events_insert_own" on public.login_events for insert with check (auth.uid() = user_id);
create policy "login_events_select_own" on public.login_events for select using (auth.uid() = user_id);

create index if not exists login_events_user_id_created_idx on public.login_events (user_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, first_name, last_name, city, investor_profile)
    values (
      new.id,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'city',
      new.raw_user_meta_data->>'investor_profile'
    )
    on conflict (id) do nothing;
  exception when others then
    null; -- never block auth signup on profile-population failure
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing users so their names appear immediately.
insert into public.profiles (id, first_name, last_name, city, investor_profile)
select id,
       raw_user_meta_data->>'first_name',
       raw_user_meta_data->>'last_name',
       raw_user_meta_data->>'city',
       raw_user_meta_data->>'investor_profile'
from auth.users
on conflict (id) do nothing;
