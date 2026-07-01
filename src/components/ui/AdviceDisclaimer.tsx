import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

/** Compact inline notice for pages showing financial ratios/metrics — not
 * investment advice, per SEBI guidance for non-registered research tools. */
export default function AdviceDisclaimer() {
  return (
    <div className="flex items-start gap-2 text-xs text-[#92640A] bg-[#FEF3C7] border border-[#FDE68A] rounded-lg px-3.5 py-2.5 mb-5">
      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
      <p>
        Data shown is for informational purposes only and is not investment advice.
        Consult a SEBI-registered advisor before investing.{' '}
        <Link href="/disclaimer" className="font-semibold underline underline-offset-2">
          Read full disclaimer
        </Link>
      </p>
    </div>
  );
}
