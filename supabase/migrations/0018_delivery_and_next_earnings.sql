-- Delivery quantity and percentage come from the same NSE bhavdata file the daily price job reads.
alter table public.prices add column if not exists delivery_qty bigint;
alter table public.prices add column if not exists delivery_pct numeric(6,2);
-- Next scheduled results date, from the weekly company profiles job.
alter table public.company_profiles add column if not exists next_earnings date;
