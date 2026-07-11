-- Razorpay's cancel-at-cycle-end API leaves the subscription's own status as
-- 'active' until the cycle actually ends — there's no field we can read back
-- from Razorpay that says "this is scheduled to cancel." We have to track
-- that intent ourselves the moment the cancel call succeeds, or the UI has
-- no way to distinguish "active, renewing" from "active, already cancelled
-- but still within the paid period."
alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;
