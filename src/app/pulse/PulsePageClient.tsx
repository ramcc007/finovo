'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Activity, Info } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';
import { authFetch } from '@/lib/authFetch';
import PulseGauge from '@/components/pulse/PulseGauge';
import ProUpsell from '@/components/billing/ProUpsell';
import { formatTradeDate } from '@/lib/utils';
import type { PulseResult } from '@/lib/pulse';

type PulseData = ({ available: true; locked?: boolean } & PulseResult) | { available: false };

export default function PulsePageClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    authFetch('/api/pulse')
      .then(r => r.json())
      .then((d: PulseData) => setData(d))
      .catch(() => setData({ available: false }))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[#8A96A8]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-6">
        <div className="flex items-center gap-2.5">
          <Activity size={22} className="text-[#F97316]" />
          <div>
            <h1 className="h-section text-[#0D1117]">Scripwise Pulse</h1>
            <p className="text-sm text-[#4A5568] mt-1">
              A fear-and-greed read on the whole market — built from our own breadth data, not a third-party index.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="card-plain p-10 flex items-center justify-center">
            <Loader2 size={22} className="animate-spin text-[#8A96A8]" />
          </div>
        ) : !data || !data.available ? (
          <div className="card-plain p-8 text-center text-sm text-[#4A5568]">
            Market sentiment isn&apos;t available right now — we show it only when enough of the
            universe has fresh, priced data to be honest about the reading.
          </div>
        ) : (
          <>
            <div className="card-plain p-6 md:p-8">
              <div className="max-w-sm mx-auto">
                <PulseGauge score={data.score} zone={data.zone} />
              </div>
              <p className="text-center text-xs text-[#8A96A8] mt-2">
                Across {data.sampleSize.toLocaleString()} priced stocks
                {data.asOf ? ` · for trading day ${formatTradeDate(data.asOf)}` : ''}
              </p>
              <p className="text-center text-[11px] text-[#B0B8C4] mt-0.5">
                This reading resets each trading day — it reflects that day&apos;s data only.
              </p>
              <div className="mt-4 flex items-start gap-2 rounded-[10px] bg-[#FFF7ED] border border-[#FED7AA] px-3.5 py-2.5">
                <Info size={15} className="text-[#EA580C] shrink-0 mt-0.5" />
                <p className="text-xs text-[#7C2D12] leading-relaxed">
                  Read it contrarian. Historically, <strong>extreme fear</strong> has clustered near market
                  bottoms and <strong>extreme greed</strong> near tops — the Pulse is a sentiment temperature,
                  not a buy/sell call.
                </p>
              </div>
            </div>

            {data.locked ? (
              <ProUpsell
                title="See what's driving the Pulse"
                description="Upgrade to Pro for the full breakdown — breadth, 52-week positioning, new highs vs lows, and benchmark momentum, each with its own weight."
              />
            ) : (
            <div className="card-plain p-6">
              <h2 className="text-sm font-semibold text-[#0D1117] mb-4">What&apos;s driving it</h2>
              <div className="space-y-4">
                {data.components.map(c => (
                  <div key={c.key}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-[#0D1117] font-medium">{c.label}</span>
                      <span className="text-[#4A5568] tabular-nums">
                        {Math.round(c.value)}<span className="text-[#8A96A8]">/100</span>
                        <span className="text-[10px] text-[#8A96A8] ml-1.5">· {Math.round(c.weight * 100)}% weight</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(c.value)}%`,
                          backgroundColor: c.value >= 55 ? '#16A34A' : c.value <= 45 ? '#DC2626' : '#94A3B8',
                        }}
                      />
                    </div>
                    <p className="text-xs text-[#8A96A8] mt-1">{c.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            )}

            <div className="card-plain p-6">
              <h2 className="text-sm font-semibold text-[#0D1117] mb-2">How it&apos;s calculated</h2>
              <p className="text-xs text-[#4A5568] leading-relaxed">
                The Pulse is a weighted blend of market breadth (how many stocks are rising vs falling),
                52-week range positioning (how much of the market is trading in the upper half of its yearly
                range), new-highs-vs-new-lows, and the headline index&apos;s move on the day. Every input is
                real EOD data from the stocks we track — there is no model and no external sentiment feed.
                Not investment advice.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
