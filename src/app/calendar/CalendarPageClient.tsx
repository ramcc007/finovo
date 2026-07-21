'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { cn, formatTradeDate } from '@/lib/utils';
import AdviceDisclaimer from '@/components/ui/AdviceDisclaimer';
import AuthGate from '@/components/auth/AuthGate';

interface EventRow {
  id: number; symbol: string; name: string; sector: string | null;
  action_type: string; ex_date: string | null; record_date: string | null; purpose: string | null;
}

const TYPES = ['All', 'Dividend', 'Bonus', 'Split', 'Rights', 'Buyback', 'Board Meeting', 'AGM', 'EGM', 'Other'];

const TYPE_COLORS: Record<string, string> = {
  Dividend: 'bg-[#DCFCE7] text-[#16A34A]',
  Bonus: 'bg-[#FFF7ED] text-[#F97316]',
  Split: 'bg-[#DBEAFE] text-[#2563EB]',
  Rights: 'bg-[#F3E8FF] text-[#9333EA]',
  Buyback: 'bg-[#FEF3C7] text-[#D97706]',
  'Board Meeting': 'bg-[#F4F6FA] text-[#4A5568]',
  AGM: 'bg-[#F4F6FA] text-[#4A5568]',
  EGM: 'bg-[#F4F6FA] text-[#4A5568]',
  Other: 'bg-[#F4F6FA] text-[#4A5568]',
};

function CalendarPageContent() {
  const [rows, setRows] = useState<EventRow[] | null>(null);
  const [type, setType] = useState('All');

  useEffect(() => {
    setRows(null);
    const params = new URLSearchParams({ days_back: '7', days_fwd: '90' });
    if (type !== 'All') params.set('type', type);
    fetch(`/api/calendar?${params}`)
      .then(r => r.json())
      .then(d => setRows(d.data ?? []))
      .catch(() => setRows([]));
  }, [type]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <AdviceDisclaimer />
        <div className="mb-6">
          <h1 className="h-section text-[#0D1117]">Corporate Actions Calendar</h1>
          <p className="text-sm text-[#4A5568] mt-1.5">
            Upcoming and recent dividends, bonuses, splits, and board meetings across NSE-listed companies.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                type === t
                  ? 'bg-[#F97316] border-[#F97316] text-white'
                  : 'bg-white border-[#E2E8F0] text-[#4A5568] hover:border-[#F97316] hover:text-[#F97316]'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {rows === null ? (
          <div className="card p-0 overflow-hidden">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="h-14 border-b border-[#EDF0F7] last:border-0 animate-pulse bg-[#FAFBFD]" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="card-plain p-12 text-center">
            <CalendarDays className="mx-auto mb-3 text-[#E2E8F0]" size={36} />
            <h3 className="font-semibold text-[#0D1117] mb-1">No events in this window</h3>
            <p className="text-sm text-[#4A5568]">
              Corporate actions ingestion runs daily — check back after the next run, or try a different type filter.
            </p>
          </div>
        ) : (
          <div className="card p-0 overflow-auto">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left">Company</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Details</th>
                  <th>Ex-Date</th>
                  <th>Record Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className={cn(r.ex_date && r.ex_date < today ? 'opacity-60' : '')}>
                    <td>
                      <Link href={`/stocks/${r.symbol}`} className="group">
                        <div className="font-semibold text-[#0D1117] group-hover:text-[#F97316] transition-colors">{r.symbol}</div>
                        <div className="text-[11px] text-[#8A96A8] font-sans mt-0.5 max-w-[200px] truncate">{r.name}</div>
                      </Link>
                    </td>
                    <td>
                      <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded', TYPE_COLORS[r.action_type] ?? TYPE_COLORS.Other)}>
                        {r.action_type}
                      </span>
                    </td>
                    <td className="text-[#4A5568] font-sans text-xs max-w-[320px] truncate">{r.purpose ?? '—'}</td>
                    <td>{r.ex_date ? formatTradeDate(r.ex_date) : '—'}</td>
                    <td>{r.record_date ? formatTradeDate(r.record_date) : '—'}</td>
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

export default function CalendarPageClient() {
  return (
    <AuthGate feature="Corporate Actions Calendar" description="Sign up free to track upcoming dividends, bonuses, splits and board meetings across NSE-listed companies.">
      <CalendarPageContent />
    </AuthGate>
  );
}
