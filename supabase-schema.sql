-- Finovo Database Schema
-- Run this in Supabase SQL editor: https://app.supabase.com → SQL Editor

-- ─────────────────────────────────────────────────────────────
-- 1. COMPANIES (master list of all NSE/BSE stocks)
-- ─────────────────────────────────────────────────────────────
create table if not exists companies (
  id                  serial primary key,
  symbol              text not null unique,   -- NSE symbol e.g. TCS
  name                text not null,
  bse_code            text,
  isin                text,
  sector              text,
  industry            text,
  market_cap_category text check (market_cap_category in ('large','mid','small','micro')),
  is_active           boolean default true,
  created_at          timestamptz default now()
);

create index if not exists idx_companies_sector on companies(sector);
create index if not exists idx_companies_symbol on companies(symbol);

-- ─────────────────────────────────────────────────────────────
-- 2. PRICES (daily EOD OHLCV)
-- ─────────────────────────────────────────────────────────────
create table if not exists prices (
  id         serial primary key,
  symbol     text not null references companies(symbol) on delete cascade,
  date       date not null,
  open       numeric(12,2),
  high       numeric(12,2),
  low        numeric(12,2),
  close      numeric(12,2) not null,
  volume     bigint,
  created_at timestamptz default now(),
  unique(symbol, date)
);

create index if not exists idx_prices_symbol_date on prices(symbol, date desc);

-- ─────────────────────────────────────────────────────────────
-- 3. FUNDAMENTALS (P&L, Balance Sheet, Cash Flow)
-- ─────────────────────────────────────────────────────────────
create table if not exists fundamentals (
  id                    serial primary key,
  symbol                text not null references companies(symbol) on delete cascade,
  period                text not null,    -- e.g. '2024-03' or '2024Q3'
  period_type           text not null check (period_type in ('annual','quarterly')),
  revenue               numeric(16,2),
  gross_profit          numeric(16,2),
  ebitda                numeric(16,2),
  net_profit            numeric(16,2),
  eps                   numeric(10,4),
  book_value_per_share  numeric(10,4),
  total_assets          numeric(16,2),
  total_equity          numeric(16,2),
  total_debt            numeric(16,2),
  cash                  numeric(16,2),
  operating_cashflow    numeric(16,2),
  investing_cashflow    numeric(16,2),
  financing_cashflow    numeric(16,2),
  free_cashflow         numeric(16,2),
  created_at            timestamptz default now(),
  unique(symbol, period, period_type)
);

create index if not exists idx_fundamentals_symbol on fundamentals(symbol, period_type, period desc);

-- ─────────────────────────────────────────────────────────────
-- 4. RATIOS (screener-queryable metrics, updated weekly)
-- ─────────────────────────────────────────────────────────────
create table if not exists ratios (
  id                  serial primary key,
  symbol              text not null references companies(symbol) on delete cascade,
  date                date not null default current_date,
  pe                  numeric(10,2),
  pb                  numeric(10,2),
  ev_ebitda           numeric(10,2),
  price_to_sales      numeric(10,2),
  dividend_yield      numeric(8,4),
  peg_ratio           numeric(10,2),
  roe                 numeric(8,4),
  roce                numeric(8,4),
  net_margin          numeric(8,4),
  operating_margin    numeric(8,4),
  asset_turnover      numeric(8,4),
  debt_to_equity      numeric(10,4),
  interest_coverage   numeric(10,2),
  current_ratio       numeric(8,4),
  quick_ratio         numeric(8,4),
  market_cap          numeric(18,2),
  enterprise_value    numeric(18,2),
  revenue_growth_1y   numeric(8,4),
  profit_growth_1y    numeric(8,4),
  revenue_growth_3y   numeric(8,4),
  profit_growth_3y    numeric(8,4),
  eps_growth_1y       numeric(8,4),
  week_high_52        numeric(12,2),
  week_low_52         numeric(12,2),
  price               numeric(12,2),
  created_at          timestamptz default now(),
  unique(symbol, date)
);

create index if not exists idx_ratios_symbol on ratios(symbol, date desc);
create index if not exists idx_ratios_screener on ratios(pe, pb, roe, debt_to_equity, market_cap);

-- ─────────────────────────────────────────────────────────────
-- 5. SHAREHOLDING (quarterly)
-- ─────────────────────────────────────────────────────────────
create table if not exists shareholding (
  id               serial primary key,
  symbol           text not null references companies(symbol) on delete cascade,
  quarter          text not null,   -- e.g. 'Dec 2024'
  promoter_pct     numeric(6,2),
  fii_pct          numeric(6,2),
  dii_pct          numeric(6,2),
  public_pct       numeric(6,2),
  pledge_pct       numeric(6,2) default 0,
  num_shareholders bigint,
  created_at       timestamptz default now(),
  unique(symbol, quarter)
);

-- ─────────────────────────────────────────────────────────────
-- 6. LIVE QUOTES CACHE (refreshed every 5 min during market hours)
-- ─────────────────────────────────────────────────────────────
create table if not exists quotes (
  symbol      text primary key references companies(symbol) on delete cascade,
  price       numeric(12,2) not null,
  change      numeric(10,2),
  change_pct  numeric(8,4),
  open        numeric(12,2),
  high        numeric(12,2),
  low         numeric(12,2),
  prev_close  numeric(12,2),
  volume      bigint,
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 6b. MARKET INDICES (top indices by volume + India VIX, EOD)
-- ─────────────────────────────────────────────────────────────
create table if not exists indices (
  symbol     text primary key,    -- NSE index name e.g. 'NIFTY 50'
  name       text not null,
  last       numeric(14,2) not null,
  change     numeric(12,2),
  change_pct numeric(8,4),
  volume     bigint,
  rank       int,                 -- display order (0 = highest volume)
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 6c. CORPORATE ACTIONS (dividends, bonus, splits, board meetings, AGM/EGM)
-- ─────────────────────────────────────────────────────────────
create table if not exists corporate_actions (
  id                 bigint generated always as identity primary key,
  symbol             text not null references companies(symbol) on delete cascade,
  action_type        text not null,  -- 'Dividend' | 'Bonus' | 'Split' | 'Rights' | 'Buyback' | 'Board Meeting' | 'AGM' | 'EGM'
  ex_date            date,
  record_date        date,
  bc_start_date      date,           -- book-closure start
  bc_end_date        date,           -- book-closure end
  purpose            text,           -- raw NSE "purpose" free-text, e.g. "Dividend - Rs 5 Per Share"
  created_at         timestamptz default now(),
  unique (symbol, action_type, ex_date, purpose)
);

create index if not exists idx_corporate_actions_symbol on corporate_actions(symbol);
create index if not exists idx_corporate_actions_ex_date on corporate_actions(ex_date);

-- ─────────────────────────────────────────────────────────────
-- 6d. AI SUMMARIES (cached plain-English reading of a stock's fundamentals)
-- ─────────────────────────────────────────────────────────────
create table if not exists ai_summaries (
  symbol       text primary key references companies(symbol) on delete cascade,
  summary      text not null,
  model        text not null,
  generated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (enable public read, restrict writes)
-- ─────────────────────────────────────────────────────────────
alter table companies   enable row level security;
alter table prices      enable row level security;
alter table fundamentals enable row level security;
alter table ratios      enable row level security;
alter table shareholding enable row level security;
alter table quotes      enable row level security;
alter table indices     enable row level security;
alter table corporate_actions enable row level security;
alter table ai_summaries enable row level security;

-- Public read access for all tables
create policy "Public read companies"    on companies    for select using (true);
create policy "Public read prices"       on prices       for select using (true);
create policy "Public read fundamentals" on fundamentals for select using (true);
create policy "Public read ratios"       on ratios       for select using (true);
create policy "Public read shareholding" on shareholding for select using (true);
create policy "Public read quotes"       on quotes       for select using (true);
create policy "Public read indices"      on indices      for select using (true);
create policy "Public read corporate_actions" on corporate_actions for select using (true);
create policy "Public read ai_summaries" on ai_summaries for select using (true);

-- ─────────────────────────────────────────────────────────────
-- 8. SCREENER VIEW (latest ratios joined with company info)
-- ─────────────────────────────────────────────────────────────
create or replace view screener_view as
select
  c.symbol,
  c.name,
  c.sector,
  c.industry,
  c.market_cap_category,
  r.pe,
  r.pb,
  r.ev_ebitda,
  r.dividend_yield,
  r.roe,
  r.roce,
  r.net_margin,
  r.operating_margin,
  r.debt_to_equity,
  r.current_ratio,
  r.quick_ratio,
  r.market_cap,
  r.revenue_growth_1y,
  r.profit_growth_1y,
  r.revenue_growth_3y,
  r.eps_growth_1y,
  r.week_high_52,
  r.week_low_52,
  r.price,
  q.change_pct,
  s.promoter_pct,
  s.pledge_pct
from companies c
left join lateral (
  select * from ratios where symbol = c.symbol order by date desc limit 1
) r on true
left join quotes q on q.symbol = c.symbol
left join lateral (
  select * from shareholding where symbol = c.symbol order by created_at desc limit 1
) s on true
where c.is_active = true;
