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
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} K`;
  return String(Math.round(value));
}

/** Render a plain date (YYYY-MM-DD) or a full ISO timestamp as a date-only
 *  label, e.g. "26 Jun 2026" — time-of-day is deliberately dropped since it
 *  isn't meaningful for once-a-day EOD data. */
export function formatTradeDate(iso: string | null | undefined): string {
  if (!iso) return '';
  // A bare date has no 'T' — anchor it to local midnight so it doesn't shift
  // a day when the browser's timezone is behind UTC. A full timestamp
  // already carries its own time/offset, so parse it as-is.
  const d = iso.includes('T') ? new Date(iso) : new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Render an ISO timestamp as a relative "Xm ago" / "just now" label — used
 *  by the live-price indicators (ticker, hero preview) so a stale feed is
 *  visibly stale rather than silently looking as fresh as a just-loaded one. */
export function timeAgoLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
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

/** Builds a CSV string from row objects, escaping quotes/commas/newlines per RFC 4180. */
export function toCSV(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const escape = (v: unknown): string => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map(c => escape(c.label)).join(',');
  const body = rows.map(r => columns.map(c => escape(r[c.key])).join(','));
  return [header, ...body].join('\n');
}

/** Triggers a browser download of the given text content as a file. */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
