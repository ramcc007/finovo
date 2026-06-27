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
