'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { formatTradeDate } from '@/lib/utils';

interface Props {
  symbol: string;
}

export default function AiSummaryCard({ symbol }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setUnavailable(false);
    fetch(`/api/stocks/${symbol}/ai-summary`)
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        if (d.unavailable && !d.summary) {
          setUnavailable(true);
        } else {
          setSummary(d.summary);
          setGeneratedAt(d.generated_at ?? null);
        }
      })
      .catch(() => { if (alive) setUnavailable(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [symbol]);

  if (unavailable) return null;

  return (
    <div className="lg:col-span-3 card-plain p-5 border-l-2 border-l-[#F97316]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#0D1117] text-sm flex items-center gap-1.5">
          <Sparkles size={14} className="text-[#F97316]" /> AI Analysis
        </h3>
        {generatedAt && (
          <span className="text-[11px] text-[#8A96A8]">Updated {formatTradeDate(generatedAt.split('T')[0])}</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-[#EEF1F7] rounded animate-pulse" />
          <div className="h-4 bg-[#EEF1F7] rounded animate-pulse w-11/12" />
          <div className="h-4 bg-[#EEF1F7] rounded animate-pulse w-4/5" />
        </div>
      ) : (
        <>
          <p className="text-sm text-[#4A5568] leading-relaxed">{summary}</p>
          <p className="text-[11px] text-[#8A96A8] mt-3">
            AI-generated from reported fundamentals. Not investment advice —
            see <Link href="/disclaimer" className="underline hover:text-[#F97316]">disclaimer</Link>.
          </p>
        </>
      )}
    </div>
  );
}
