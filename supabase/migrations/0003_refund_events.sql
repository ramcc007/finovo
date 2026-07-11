-- Audit trail for admin-issued refunds. RLS is enabled with NO client
-- policies at all — this table is only ever touched by the service role
-- (from /api/admin/users/[id]/refund), so regular users can never read or
-- write refund records regardless of auth state.
create table if not exists public.refund_events (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  razorpay_payment_id text not null,
  amount numeric not null, -- rupees
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);
alter table public.refund_events enable row level security;

create index if not exists refund_events_user_id_idx on public.refund_events (user_id, created_at desc);
