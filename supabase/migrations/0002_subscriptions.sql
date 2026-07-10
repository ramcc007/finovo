-- Billing state, one row per user. Written ONLY by the Razorpay webhook via
-- the service role (which bypasses RLS); clients may read their own row but
-- can never write it — so a user can't grant themselves Pro from the browser.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro')),
  status text not null default 'inactive'
    check (status in ('inactive','pending','active','halted','cancelled','expired')),
  razorpay_customer_id text,
  razorpay_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;

-- Read-only for the owner. Deliberately NO insert/update/delete policy for
-- anon or authenticated → only the service-role webhook can mutate it.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid() = user_id);

create index if not exists subscriptions_rzp_sub_idx on public.subscriptions (razorpay_subscription_id);
