/**
 * Single source of truth for plans and what each unlocks. The pricing page
 * renders from this, and the server-side entitlement gates (added when
 * Razorpay is wired) will check the same feature keys — so the marketing
 * page and the actual paywall can never drift apart.
 */

export type PlanId = 'free' | 'pro';

export const PRO_PRICE_INR = 499;
export const PRO_PERIOD = 'year' as const;
export const PRO_PRICE_LABEL = '₹499';
export const PRO_PER_MONTH_LABEL = '≈ ₹42/mo, billed yearly';

/** Machine-checkable capability keys used by entitlement gating. */
export type FeatureKey =
  | 'screener_all_filters'
  | 'saved_screens_unlimited'
  | 'csv_export'
  | 'scorecard_full'
  | 'pulse_full'
  | 'watchlist_unlimited'
  | 'compare_tool';

export const PRO_FEATURES: ReadonlySet<FeatureKey> = new Set<FeatureKey>([
  'screener_all_filters',
  'saved_screens_unlimited',
  'csv_export',
  'scorecard_full',
  'pulse_full',
  'watchlist_unlimited',
  'compare_tool',
]);

/** Free-tier soft limits, referenced by both the UI and server checks. */
export const FREE_WATCHLIST_LIMIT = 10;
export const FREE_SAVED_SCREENS_LIMIT = 1;
export const FREE_SCREENER_FILTER_COUNT = 10;

export interface FeatureRow {
  label: string;
  detail?: string;
  free: boolean | string;
  pro: boolean | string;
}

export interface FeatureGroup {
  group: string;
  rows: FeatureRow[];
}

export const FEATURE_MATRIX: FeatureGroup[] = [
  {
    group: 'Screening',
    rows: [
      { label: 'Stock screener', detail: 'Filter 5,000+ NSE & BSE companies', free: 'Core filters', pro: 'All 47 filters' },
      { label: 'Quick-filter presets', free: true, pro: true },
      { label: 'Save custom screens', free: `${FREE_SAVED_SCREENS_LIMIT} screen`, pro: 'Unlimited' },
      { label: 'CSV / Excel export', detail: 'Screener, Watchlist & Compare', free: false, pro: true },
    ],
  },
  {
    group: 'Analysis',
    rows: [
      { label: 'Company pages, fundamentals & charts', free: true, pro: true },
      { label: 'Scripwise Score', free: 'Headline score', pro: true },
      { label: 'Scripwise Scorecard', detail: 'Category dials, red flags & history', free: false, pro: true },
      { label: 'Scripwise Pulse', detail: 'Market fear/greed gauge', free: 'Headline reading', pro: 'Full breakdown' },
      { label: 'Multi-stock Compare', free: false, pro: true },
    ],
  },
  {
    group: 'Markets & data',
    rows: [
      { label: 'Markets overview & live ticker', free: true, pro: true },
      { label: 'Near-real-time prices', detail: 'Refreshed through the trading day', free: true, pro: true },
      { label: 'Corporate actions calendar', free: true, pro: true },
    ],
  },
  {
    group: 'Portfolio',
    rows: [
      { label: 'Watchlist', free: `Up to ${FREE_WATCHLIST_LIMIT} stocks`, pro: 'Unlimited' },
    ],
  },
];

/** The short bullet lists shown on the two plan cards. */
export const FREE_HIGHLIGHTS: string[] = [
  'Screener with core filters',
  'Company pages, fundamentals & charts',
  'Markets, live ticker & near-real-time prices',
  `Watchlist up to ${FREE_WATCHLIST_LIMIT} stocks`,
  'Scripwise Score & Pulse — headline reading',
  'Corporate actions calendar',
];

export const PRO_HIGHLIGHTS: string[] = [
  'Everything in Free, plus:',
  'All 47 screener filters & advanced criteria',
  'Unlimited saved screens',
  'CSV / Excel export everywhere',
  'Full Scripwise Scorecard — dials, red flags & history',
  'Full Pulse breakdown & drivers',
  'Unlimited watchlist & multi-stock Compare',
];
