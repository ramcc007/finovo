export interface Company {
  id: number;
  symbol: string;
  name: string;
  bse_code: string | null;
  isin: string | null;
  sector: string | null;
  industry: string | null;
  market_cap_category: 'large' | 'mid' | 'small' | 'micro' | null;
  is_active: boolean;
  created_at: string;
}

export interface Price {
  id: number;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  created_at: string;
}

export interface Fundamental {
  id: number;
  symbol: string;
  period: string;
  period_type: 'annual' | 'quarterly';
  revenue: number | null;
  gross_profit: number | null;
  ebitda: number | null;
  net_profit: number | null;
  eps: number | null;
  book_value_per_share: number | null;
  total_assets: number | null;
  total_equity: number | null;
  total_debt: number | null;
  cash: number | null;
  operating_cashflow: number | null;
  investing_cashflow: number | null;
  financing_cashflow: number | null;
  free_cashflow: number | null;
  created_at: string;
}

export interface Ratio {
  id: number;
  symbol: string;
  date: string;
  pe: number | null;
  pb: number | null;
  ev_ebitda: number | null;
  price_to_sales: number | null;
  dividend_yield: number | null;
  peg_ratio: number | null;
  roe: number | null;
  roce: number | null;
  net_margin: number | null;
  operating_margin: number | null;
  asset_turnover: number | null;
  debt_to_equity: number | null;
  interest_coverage: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  market_cap: number | null;
  enterprise_value: number | null;
  revenue_growth_1y: number | null;
  profit_growth_1y: number | null;
  revenue_growth_3y: number | null;
  profit_growth_3y: number | null;
  eps_growth_1y: number | null;
  week_high_52: number | null;
  week_low_52: number | null;
  created_at: string;
}

export interface Shareholding {
  id: number;
  symbol: string;
  quarter: string;
  promoter_pct: number | null;
  fii_pct: number | null;
  dii_pct: number | null;
  public_pct: number | null;
  pledge_pct: number | null;
  num_shareholders: number | null;
  created_at: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  open: number;
  high: number;
  low: number;
  prev_close: number;
  volume: number;
  market_cap: number | null;
}

export interface ScreenerFilters {
  sector?: string;
  index_name?: string;
  mcap_min?: number;
  mcap_max?: number;
  pe_min?: number;
  pe_max?: number;
  pb_min?: number;
  pb_max?: number;
  roe_min?: number;
  roe_max?: number;
  roce_min?: number;
  debt_equity_max?: number;
  div_yield_min?: number;
  rev_growth_1y_min?: number;
  profit_growth_1y_min?: number;
  promoter_min?: number;
  pledge_max?: number;
  price_min?: number;
  price_max?: number;
  current_ratio_min?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}
