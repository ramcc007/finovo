import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCrores(value: number): string {
  if (value >= 100000) return `${(value / 100000).toFixed(2)}L Cr`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K Cr`;
  return `${value.toFixed(2)} Cr`;
}

/** Format a raw share volume into Indian abbreviations (L = lakh, Cr = crore). */
export function formatVolume(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return '—';
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(Math.round(value));
}

/** Render an ISO date (YYYY-MM-DD) as e.g. "26 Jun 2026". */
export function formatTradeDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatRatio(value: number, suffix = 'x'): string {
  return `${value.toFixed(1)}${suffix}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function isPositive(value: number): boolean {
  return value >= 0;
}
