'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2, Star, Download } from 'lucide-react';
import { cn, formatCrores, formatPrice, toCSV, downloadTextFile } from '@/lib/utils';
import { useWatchlist } from '@/lib/useWatchlist';
import AdviceDisclaimer from '@/components/ui/AdviceDisclaimer';
import AuthGate from '@/components/auth/AuthGate';

interface Row {
  symbol: string; name: string; sector: string | null; price: number | null;
  change_pct: number | null; market_cap: number | null; pe: number | null; roe: number | null;
}

function WatchlistPageContent() {
  const { symbols, remove } = useWatchlist();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (symbols.length === 0) { setRows([]); return; }
    setRows(null);
    fetch(`/api/screener?symbols=${symbols.join(',')}&per_page=${symbols.length}`)
      .then(r => r.json())
      .then(d => setRows(d.data ?? []))
      .catch(() => setRows([]));
  }, [symbols]);

  // Preserve the order stocks were added in, not whatever the DB returns.
  const ordered = rows ? symbols.map(s => rows.find(r => r.symbol === s)).filter((r): r is Row => !!r) : null;

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <AdviceDisclaimer />
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="h-section text-[#0D1117]">Watchlist</h1>
            <p className="text-sm text-[#4A5568] mt-1.5">
              Stocks you&apos;re tracking, saved on this device.
            </p>
          </div>
          {ordered && ordered.length > 0 && (
            <button
              onClick={() => {
                const csv = toCSV(ordered as unknown as Record<string, unknown>[], [
                  { key: 'symbol', label: 'Symbol' },
                  { key: 'name', label: 'Name' },
                  { key: 'sector', label: 'Sector' },
                  { key: 'price', label: 'Price' },
                  { key: 'change_pct', label: 'Change %' },
                  { key: 'market_cap', label: 'Market Cap (Cr)' },
                  { key: 'pe', label: 'P/E' },
                  { key: 'roe', label: 'ROE %' },
                ]);
                downloadTextFile(`scripwise-watchlist-${new Date().toISOString().slice(0, 10)}.csv`, csv);
              }}
              className="btn btn-secondary !px-3 !py-2 !text-[13px] shrink-0"
            >
              <Download size={13} /> Export CSV
            </button>
          )}
        </div>

        {symbols.length === 0 ? (
          <div className="card-plain p-12 text-center">
            <Star className="mx-auto mb-3 text-[#E2E8F0]" size={36} />
            <h3 className="font-semibold text-[#0D1117] mb-1">Your watchlist is empty</h3>
            <p className="text-sm text-[#4A5568] mb-5">
              Open any stock page and click &quot;Add to Watchlist&quot; to track it here.
            </p>
            <Link href="/screener" className="btn btn-primary inline-flex">Browse the Explorer</Link>
          </div>
        ) : ordered === null ? (
          <div className="card p-0 overflow-hidden">
            {Array(symbols.length).fill(0).map((_, i) => (
              <div key={i} className="h-14 border-b border-[#EDF0F7] last:border-0 animate-pulse bg-[#FAFBFD]" />
            ))}
          </div>
        ) : (
          <div className="card p-0 overflow-auto">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left">Company</th>
                  <th>Price (₹)</th>
                  <th>Mkt Cap</th>
                  <th>P/E</th>
                  <th>ROE %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ordered.map(s => (
                  <tr key={s.symbol} className="group">
                    <td>
                      <Link href={`/stocks/${s.symbol}`}>
                        <div className="font-semibold text-[#0D1117] group-hover:text-[#F97316] transition-colors">{s.symbol}</div>
                        <div className="text-[11px] text-[#8A96A8] font-sans mt-0.5 max-w-[220px] truncate">{s.name}</div>
                      </Link>
                    </td>
                    <td>
                      {s.price != null ? formatPrice(s.price) : '—'}
                      {s.change_pct != null && (
                        <div className={cn('text-[11px] font-medium', s.change_pct >= 0 ? 'text-positive' : 'text-negative')}>
                          {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                        </div>
                      )}
                    </td>
                    <td className="text-[#4A5568]">{s.market_cap ? formatCrores(s.market_cap) : '—'}</td>
                    <td>{s.pe ? `${s.pe.toFixed(1)}x` : '—'}</td>
                    <td>{s.roe != null ? `${s.roe.toFixed(1)}%` : '—'}</td>
                    <td>
                      <button
                        onClick={() => remove(s.symbol)}
                        className="text-[#8A96A8] hover:text-[#DC2626] transition-colors p-2.5"
                        aria-label={`Remove ${s.symbol} from watchlist`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  return (
    <AuthGate feature="Watchlist" description="Sign up free to track stocks and access them from any device.">
      <WatchlistPageContent />
    </AuthGate>
  );
}
