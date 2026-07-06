'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gauge, Check, TriangleAlert, X, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScoreResult, MetricStatus } from '@/lib/finovoScore';

const BAND_COLOR: Record<ScoreResult['band'], string> = {
  Excellent: '#16A34A',
  Strong: '#65A30D',
  Moderate: '#D97706',
  Weak: '#DC2626',
  'Limited data': '#8A96A8',
};

const STATUS_ICON: Record<MetricStatus, React.ReactNode> = {
  good: <Check size={13} className="text-[#16A34A]" />,
  warn: <TriangleAlert size={13} className="text-[#D97706]" />,
  bad: <X size={13} className="text-[#DC2626]" />,
  na: <Minus size={13} className="text-[#8A96A8]" />,
};

interface HistoryPoint { date: string; score: number }

function ScoreHistoryChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) return null;
  const barColor = (score: number) => score >= 75 ? '#16A34A' : score >= 58 ? '#65A30D' : score >= 40 ? '#D97706' : '#DC2626';
  return (
    <div className="mt-5 pt-4 border-t border-[#EDF0F7]">
      <h4 className="text-[11px] font-semibold text-[#8A96A8] uppercase tracking-wide mb-3">Score History</h4>
      <div className="flex items-end gap-2.5 h-20 px-0.5">
        {points.map(p => (
          <div key={p.date} className="flex-1 flex flex-col items-center justify-end h-full min-w-0 group">
            <span className="text-[10px] font-semibold text-[#0D1117] mb-1 opacity-0 group-hover:opacity-100 transition-opacity num">{p.score}</span>
            <div
              className="w-full max-w-[22px] rounded-t-sm transition-all"
              style={{ height: `${Math.max(4, p.score)}%`, background: barColor(p.score) }}
              title={`${p.date}: ${p.score}`}
            />
            <span className="text-[9px] text-[#8A96A8] mt-1.5 whitespace-nowrap">
              {new Date(p.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  symbol: string;
}

export default function FinovoScoreCard({ symbol }: Props) {
  const [data, setData] = useState<ScoreResult | null>(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/stocks/${symbol}/score`)
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        if (!d.available) { setAvailable(false); return; }
        setData(d);
      })
      .catch(() => { if (alive) setAvailable(false); })
      .finally(() => { if (alive) setLoading(false); });

    fetch(`/api/stocks/${symbol}/score/history`)
      .then(r => r.json())
      .then(d => { if (alive && d.available) setHistory(d.points); })
      .catch(() => {});

    return () => { alive = false; };
  }, [symbol]);

  if (!available) return null;

  return (
    <div className="lg:col-span-3 card-plain p-5 border-l-2 border-l-[#F97316]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#0D1117] text-sm flex items-center gap-1.5">
          <Gauge size={14} className="text-[#F97316]" /> Finovo Score
        </h3>
      </div>

      {loading || !data ? (
        <div className="space-y-2">
          <div className="h-4 bg-[#EEF1F7] rounded animate-pulse" />
          <div className="h-4 bg-[#EEF1F7] rounded animate-pulse w-11/12" />
          <div className="h-4 bg-[#EEF1F7] rounded animate-pulse w-4/5" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-5 mb-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center shrink-0 text-2xl font-bold text-white"
              style={{ background: BAND_COLOR[data.band] }}
            >
              {data.score}
            </div>
            <div>
              <div className="text-base font-bold text-[#0D1117]">{data.band}</div>
              <p className="text-xs text-[#4A5568] mt-1 max-w-md leading-relaxed">
                A rule-based read of profitability, growth, valuation vs. sector, financial
                health, and shareholder position — computed from reported fundamentals only.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {data.breakdown.map(line => (
              <div key={line.label} className="flex items-center justify-between py-1.5 border-b border-[#EDF0F7]">
                <span className="flex items-center gap-2 text-sm text-[#4A5568]">
                  {STATUS_ICON[line.status]} {line.label}
                </span>
                <span className={cn(
                  'num text-xs font-medium',
                  line.status === 'good' && 'text-positive',
                  line.status === 'bad' && 'text-negative',
                  line.status === 'warn' && 'text-[#D97706]',
                  line.status === 'na' && 'text-[#8A96A8]',
                )}>
                  {line.detail}
                </span>
              </div>
            ))}
          </div>

          <ScoreHistoryChart points={history} />

          <p className="text-[11px] text-[#8A96A8] mt-4">
            Not investment advice — see <Link href="/disclaimer" className="underline hover:text-[#F97316]">disclaimer</Link>.
          </p>
        </>
      )}
    </div>
  );
}
