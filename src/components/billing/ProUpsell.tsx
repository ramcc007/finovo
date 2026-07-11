import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  compact?: boolean;
}

/** Drop-in replacement for a Pro-only section — matches card-plain styling
 *  used across the app so it reads as part of the page, not an ad. */
export default function ProUpsell({ title, description, compact = false }: Props) {
  return (
    <div className={`card-plain border-dashed border-2 border-[#F0D9C0] bg-[#FFFBF7] flex flex-col items-center text-center ${compact ? 'p-5' : 'p-8'}`}>
      <div className="w-10 h-10 rounded-full bg-[#FFF3E8] text-[#F97316] flex items-center justify-center mb-3">
        <Lock size={16} />
      </div>
      <h3 className="text-sm font-semibold text-[#0D1117] mb-1.5">{title}</h3>
      <p className="text-xs text-[#8A96A8] max-w-xs mb-4 leading-relaxed">{description}</p>
      <Link href="/pricing" className="btn btn-primary !py-2 !px-4 !text-[13px]">
        Upgrade to Pro — ₹499/yr <ArrowRight size={14} />
      </Link>
    </div>
  );
}
