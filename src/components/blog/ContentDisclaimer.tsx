import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { DEFAULT_DISCLAIMER } from '@/lib/blog';

/** The disclaimer box at the end of every blog article and glossary page. */
export default function ContentDisclaimer({ sourced = false }: { sourced?: boolean }) {
  return (
    <aside aria-labelledby="disclaimer" className="mt-12 rounded-2xl border border-[#FED7AA] border-l-4 border-l-[#F97316] bg-[#FFF7ED] p-5 md:p-6">
      <h2 id="disclaimer" className="mb-2 flex items-center gap-2 text-lg font-bold text-[#9A3412]">
        <ShieldAlert size={20} aria-hidden /> Disclaimer
      </h2>
      <p className="text-base leading-relaxed text-[#7C2D12]">{DEFAULT_DISCLAIMER}</p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#9A3412]">
        <li>
          Scripwise is not registered with SEBI as an investment adviser or research analyst, is not an AMFI-registered mutual fund
          distributor and is not regulated by the RBI.
        </li>
        <li>Companies, funds and products named here are examples used to explain a point. They are not recommendations.</li>
        <li>Scripwise and its writers do not receive payment from any broker, fund house or company mentioned.</li>
        <li>Mutual fund investments are subject to market risks, read all scheme related documents carefully.</li>
        <li>Tax rules and rates change. Please check the current rules with a tax professional before acting on them.</li>
        <li>
          Figures are taken from {sourced ? 'the sources credited above' : 'public sources'} and may change; please verify them before acting on
          them. Found an error? <Link href="/contact" className="font-semibold underline">Tell us</Link> and we will correct it.
        </li>
      </ul>
    </aside>
  );
}
