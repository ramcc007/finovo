'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Loader2, Download } from 'lucide-react';
import { cn, formatCrores, formatPrice, toCSV, downloadTextFile } from '@/lib/utils';
import AdviceDisclaimer from '@/components/ui/AdviceDisclaimer';
import AuthGate from '@/components/auth/AuthGate';
import ProGate from '@/components/billing/ProGate';

const MAX_SYMBOLS = 4;

interface Row {
  symbol: string; name: string; sector: string | null; price: number | null;
  change_pct: number | null; market_cap: number | null; pe: number | null; pb: number | null;
  roe: number | null; roce: number | null; net_margin: number | null; debt_to_equity: number | null;
  revenue_growth_1y: number | null; profit_growth_1y: number | null; dividend_yield: number | null;
  promoter_pct: number | null; pledge_pct: number | null;
}

interface SearchHit { symbol: string; name: string; sector: string }

type MetricFmt = (v: number | null) => string;
const pct: MetricFmt = v => v != null ? `${v.toFixed(1)}%` : '—';
const signedPct: MetricFmt = v => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—';
const ratio: MetricFmt = v => v != null ? `${v.toFixed(2)}x` : '—';
const rupee: MetricFmt = v => v != null ? `₹ ${formatPrice(v)}` : '—';
const cap: MetricFmt = v => v != null ? `₹ ${formatCrores(v)}` : '—';

const METRICS: { label: string; key: keyof Row; fmt: MetricFmt; higherIsBetter?: boolean }[] = [
  { label: 'Price', key: 'price', fmt: rupee },
  { label: 'Day Change', key: 'change_pct', fmt: signedPct },
  { label: 'Market Cap', key: 'market_cap', fmt: cap, higherIsBetter: true },
  { label: 'P/E Ratio', key: 'pe', fmt: ratio },
  { label: 'P/B Ratio', key: 'pb', fmt: ratio },
  { label: 'ROE', key: 'roe', fmt: pct, higherIsBetter: true },
  { label: 'ROCE', key: 'roce', fmt: pct, higherIsBetter: true },
  { label: 'Net Margin', key: 'net_margin', fmt: pct, higherIsBetter: true },
  { label: 'Debt / Equity', key: 'debt_to_equity', fmt: ratio, higherIsBetter: false },
  { label: 'Revenue Growth 1Y', key: 'revenue_growth_1y', fmt: signedPct, higherIsBetter: true },
  { label: 'Profit Growth 1Y', key: 'profit_growth_1y', fmt: signedPct, higherIsBetter: true },
  { label: 'Dividend Yield', key: 'dividend_yield', fmt: pct, higherIsBetter: true },
  { label: 'Promoter Holding', key: 'promoter_pct', fmt: pct },
  { label: 'Pledge %', key: 'pledge_pct', fmt: pct, higherIsBetter: false },
];

function ComparePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = (searchParams.get('symbols') ?? '')
    .split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, MAX_SYMBOLS);

  const [symbols, setSymbols] = useState<string[]>(initial);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const url = symbols.length ? `/compare?symbols=${symbols.join(',')}` : '/compare';
    router.replace(url, { scroll: false });

    if (symbols.length === 0) { setRows([]); return; }
    setLoading(true);
    fetch(`/api/screener?symbols=${symbols.join(',')}&per_page=${symbols.length}`)
      .then(r => r.json())
      .then(d => setRows(d.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => setResults(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  const addSymbol = (s: string) => {
    if (symbols.includes(s) || symbols.length >= MAX_SYMBOLS) return;
    setSymbols(prev => [...prev, s]);
    setQuery('');
    setResults([]);
  };
  const removeSymbol = (s: string) => setSymbols(prev => prev.filter(x => x !== s));

  // Preserve selection order regardless of API response order.
  const ordered = useMemo(
    () => symbols.map(s => rows.find(r => r.symbol === s)).filter((r): r is Row => !!r),
    [symbols, rows]
  );

  const best = (key: keyof Row, higherIsBetter?: boolean): string | null => {
    if (higherIsBetter === undefined) return null;
    const vals = ordered.map(r => r[key] as number | null).filter((v): v is number => v != null);
    if (vals.length < 2) return null;
    const target = higherIsBetter ? Math.max(...vals) : Math.min(...vals);
    const winner = ordered.find(r => r[key] === target);
    return winner?.symbol ?? null;
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <AdviceDisclaimer />
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h1 className="h-section text-[#0D1117]">Compare Stocks</h1>
            <p className="text-sm text-[#4A5568] mt-1.5">
              Pick up to {MAX_SYMBOLS} companies to compare side by side.
            </p>
          </div>
          {ordered.length > 0 && (
            <button
              onClick={() => {
                const csvRows = ordered.map(s => {
                  const row: Record<string, unknown> = { symbol: s.symbol, name: s.name };
                  for (const m of METRICS) row[m.key] = s[m.key];
                  return row;
                });
                const csv = toCSV(csvRows, [
                  { key: 'symbol', label: 'Symbol' },
                  { key: 'name', label: 'Name' },
                  ...METRICS.map(m => ({ key: m.key as string, label: m.label })),
                ]);
                downloadTextFile(`scripwise-compare-${new Date().toISOString().slice(0, 10)}.csv`, csv);
              }}
              className="btn btn-secondary !px-3 !py-2 !text-[13px] shrink-0"
            >
              <Download size={13} /> Export CSV
            </button>
          )}
        </div>

        {/* Symbol picker */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {symbols.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-full pl-3 pr-1.5 py-1 text-sm font-medium text-[#0D1117]">
              {s}
              <button onClick={() => removeSymbol(s)} className="text-[#8A96A8] hover:text-[#DC2626] p-2 -m-1">
                <X size={13} />
              </button>
            </span>
          ))}

          {symbols.length < MAX_SYMBOLS && (
            <div className="relative">
              <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-full px-3 py-1.5 focus-within:border-[#F97316] transition-colors">
                <Search size={14} className="text-[#8A96A8]" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Add a company…"
                  className="text-sm outline-none w-40 placeholder:text-[#8A96A8]"
                />
                {searching && <Loader2 size={13} className="animate-spin text-[#8A96A8]" />}
              </div>
              {results.length > 0 && (
                <div className="absolute top-full mt-1 left-0 w-64 bg-white border border-[#E2E8F0] rounded-xl shadow-[0_12px_32px_rgba(16,24,40,0.12)] overflow-hidden z-10">
                  {results.map(r => (
                    <button
                      key={r.symbol}
                      onClick={() => addSymbol(r.symbol)}
                      disabled={symbols.includes(r.symbol)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-[#FFF7ED] transition-colors border-b border-[#F0F3F8] last:border-0 disabled:opacity-40"
                    >
                      <div className="text-sm font-semibold text-[#0D1117]">{r.symbol}</div>
                      <div className="text-xs text-[#8A96A8] truncate">{r.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {symbols.length === 0 ? (
          <div className="card-plain p-12 text-center text-[#8A96A8]">
            Search and add companies above to start comparing.
          </div>
        ) : loading ? (
          <div className="card p-8"><div className="h-64 bg-[#EEF1F7] rounded animate-pulse" /></div>
        ) : (
          <div className="card p-0 overflow-auto">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left">Metric</th>
                  {ordered.map(s => (
                    <th key={s.symbol} className="text-right">
                      <Link href={`/stocks/${s.symbol}`} className="hover:text-[#F97316] transition-colors">
                        <div className="font-semibold text-[#0D1117]">{s.symbol}</div>
                        <div className="text-[10px] font-normal text-[#8A96A8] max-w-[140px] truncate ml-auto">{s.name}</div>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map(m => {
                  const winner = best(m.key, m.higherIsBetter);
                  return (
                    <tr key={m.label}>
                      <td className="text-[#4A5568] font-sans text-xs">{m.label}</td>
                      {ordered.map(s => (
                        <td
                          key={s.symbol}
                          className={cn(s.symbol === winner ? 'font-semibold text-positive' : '')}
                        >
                          {m.fmt(s[m.key] as number | null)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <AuthGate feature="Compare Stocks" description="Sign up free to compare up to 4 companies side by side across 14 fundamental metrics.">
      <ProGate feature="Compare Stocks" description="Upgrade to Pro to compare up to 4 companies side by side across 14 fundamental metrics.">
        <Suspense fallback={null}>
          <ComparePageInner />
        </Suspense>
      </ProGate>
    </AuthGate>
  );
}
