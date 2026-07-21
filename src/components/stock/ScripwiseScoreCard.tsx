'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gauge, Check, TriangleAlert, X, Minus, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/authFetch';
import ProUpsell from '@/components/billing/ProUpsell';
import { summariseByCategory, redFlags, type ScoreResult, type MetricStatus } from '@/lib/scripwiseScore';

const CATEGORY_COLOR = (pct: number) => (pct >= 70 ? '#16A34A' : pct >= 45 ? '#D97706' : '#DC2626');

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

interface HistoryPoint { date: string; score: number; approx?: boolean }

function ScoreHistoryChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) return null;
  const barColor = (score: number) => score >= 75 ? '#16A34A' : score >= 58 ? '#65A30D' : score >= 40 ? '#D97706' : '#DC2626';

  const formatPoint = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

  // Fewer than a handful of points — fixed-width bars packed to the left
  // (instead of flex-1 stretching each bar across its own share of the
  // full width) so a couple of points don't spread edge-to-edge with a
  // large empty gap that reads as broken rather than "still early". Only
  // triggers for a brand-new listing with no price history to fall back on.
  const sparse = points.length < 6;
  const hasApprox = points.some(p => p.approx);

  return (
    <div className="mt-5 pt-4 border-t border-[#EDF0F7]">
      <h4 className="text-[11px] font-semibold text-[#8A96A8] uppercase tracking-wide mb-3">Score History</h4>
      <div className={cn('flex items-end gap-2.5 h-20 px-0.5', sparse && 'justify-start')}>
        {points.map(p => (
          <div key={p.date} className={cn('flex flex-col items-center justify-end h-full min-w-0 group', sparse ? 'w-10 shrink-0' : 'flex-1')}>
            <span className="text-[10px] font-semibold text-[#0D1117] mb-1 opacity-0 group-hover:opacity-100 transition-opacity num">{p.score}</span>
            <div
              className={cn('w-full max-w-[22px] rounded-t-sm transition-all', p.approx && 'opacity-50')}
              style={{ height: `${Math.max(4, p.score)}%`, background: barColor(p.score) }}
              title={`${p.date}: ${p.score}${p.approx ? ' (estimated from price history)' : ''}`}
            />
            <span className="text-[9px] text-[#8A96A8] mt-1.5 whitespace-nowrap">
              {formatPoint(p.date)}{p.approx && '*'}
            </span>
          </div>
        ))}
      </div>
      {hasApprox && (
        <p className="text-[10px] text-[#8A96A8] mt-2">
          * Estimated from that month&apos;s closing price against the latest reported fundamentals — not a captured
          snapshot for that month.
        </p>
      )}
      {sparse && (
        <p className="text-[10px] text-[#8A96A8] mt-2">
          More history will appear here as new price and fundamentals data comes in.
        </p>
      )}
    </div>
  );
}

interface Props {
  symbol: string;
}

export default function ScripwiseScoreCard({ symbol }: Props) {
  const [data, setData] = useState<(ScoreResult & { locked?: boolean; previewing?: boolean }) | null>(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyLocked, setHistoryLocked] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    authFetch(`/api/stocks/${symbol}/score`)
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        if (!d.available) { setAvailable(false); return; }
        setData(d);
      })
      .catch(() => { if (alive) setAvailable(false); })
      .finally(() => { if (alive) setLoading(false); });

    authFetch(`/api/stocks/${symbol}/score/history`)
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        if (d.available) setHistory(d.points);
        else if (d.locked) setHistoryLocked(true);
      })
      .catch(() => {});

    return () => { alive = false; };
  }, [symbol]);

  if (!available) return null;

  return (
    <div className="lg:col-span-3 card-plain p-5 border-l-2 border-l-[#F97316]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#0D1117] text-sm flex items-center gap-1.5">
          <Gauge size={14} className="text-[#F97316]" /> Scripwise Scorecard
        </h3>
        {data?.previewing && (
          <span className="text-[10px] font-semibold text-[#D97706] bg-[#FFF7ED] border border-[#FED7AA] px-1.5 py-0.5 rounded-md">
            Free preview
          </span>
        )}
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

          {data.locked ? (
            <ProUpsell
              compact
              title="Unlock the full Scorecard"
              description="Category dials, red flags, the full metric breakdown, and score history — upgrade to Pro to see what's behind this score."
            />
          ) : (
            <>
              {/* Category dials */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                {summariseByCategory(data.breakdown).map(c => (
                  <div key={c.category} className="rounded-[10px] bg-[#F7F9FC] border border-[#EDF0F7] px-3 py-2.5">
                    <div className="text-[11px] text-[#8A96A8] leading-tight mb-1.5 h-7">{c.category}</div>
                    {c.graded ? (
                      <>
                        <div className="text-lg font-bold num" style={{ color: CATEGORY_COLOR(c.pct) }}>{c.pct}</div>
                        <div className="h-1 rounded-full bg-[#E2E8F0] overflow-hidden mt-1">
                          <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: CATEGORY_COLOR(c.pct) }} />
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-[#8A96A8]">—</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Red flags */}
              {redFlags(data.breakdown).length > 0 && (
                <div className="mb-5 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShieldAlert size={14} className="text-[#DC2626]" />
                    <span className="text-xs font-semibold text-[#991B1B]">
                      Red flags ({redFlags(data.breakdown).length})
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {redFlags(data.breakdown).map(f => (
                      <li key={f.label} className="flex items-center justify-between text-xs">
                        <span className="text-[#7F1D1D]">{f.label}</span>
                        <span className="num text-[#991B1B] font-medium">{f.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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

              {historyLocked ? null : <ScoreHistoryChart points={history} />}
            </>
          )}

          <p className="text-[11px] text-[#8A96A8] mt-4">
            Not investment advice — see <Link href="/disclaimer" className="underline hover:text-[#F97316]">disclaimer</Link>.
          </p>
        </>
      )}
    </div>
  );
}
