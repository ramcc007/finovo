import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus, Sparkles, ShieldCheck, HelpCircle } from 'lucide-react';
import {
  FEATURE_MATRIX, FREE_HIGHLIGHTS, PRO_HIGHLIGHTS,
  PRO_PRICE_LABEL, PRO_PER_MONTH_LABEL, type FeatureRow,
} from '@/lib/plans';
import { FreeCTA, ProCTA } from './PricingCTA';

export const metadata: Metadata = {
  title: 'Pricing — Scripwise',
  description:
    'Start free, or go Pro for ₹499/year to unlock all screener filters, CSV export, the full Scripwise Scorecard and Pulse, and unlimited watchlists.',
};

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={16} className="text-[#16A34A] mx-auto" aria-label="Included" />;
  if (value === false) return <Minus size={15} className="text-[#C7CED9] mx-auto" aria-label="Not included" />;
  return <span className="text-xs font-medium text-[#0D1117]">{value}</span>;
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What happens after I pay?',
    a: 'Pro unlocks instantly on your account — all filters, exports, the full Scorecard and Pulse, and unlimited watchlists. It stays active for a full year.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel from your profile at any time; Pro simply stops renewing at the end of your paid year and you keep access until then.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Because Pro is a digital subscription unlocked immediately, payments are non-refundable once the plan is active. The Free tier lets you try the core product first, no card needed.',
  },
  {
    q: 'Is the market data real-time?',
    a: 'Prices are refreshed through the trading day and are near-real-time (subject to the exchange’s standard ~15-minute delay). Scripwise is a research and screening tool — not investment advice.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12 md:py-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#EA580C] bg-[#FFF3E8] border border-[#FFEDD5] px-3 py-1 rounded-full mb-4">
            <Sparkles size={12} /> Simple, honest pricing
          </span>
          <h1 className="h-display text-[#131A24] mb-4">One plan. Everything unlocked.</h1>
          <p className="text-[#56616F] text-base md:text-lg leading-relaxed">
            Start free and screen 5,000+ Indian companies today. Upgrade to Pro for the price of a
            single coffee a month to unlock the full toolkit.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-5 md:gap-6 max-w-3xl mx-auto mb-16">
          {/* Free */}
          <div className="card-plain p-7 flex flex-col">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-[#0D1117]">Free</h2>
              <p className="text-sm text-[#56616F] mt-1">Everything you need to start researching.</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-[#0D1117]">₹0</span>
              <span className="text-sm text-[#8A96A8] ml-1.5">forever</span>
            </div>
            <div className="mb-6"><FreeCTA /></div>
            <ul className="space-y-3 mt-auto">
              {FREE_HIGHLIGHTS.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[#374151]">
                  <Check size={16} className="text-[#16A34A] shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl bg-white border-2 border-[#F97316] p-7 flex flex-col shadow-[0_20px_50px_rgba(249,115,22,0.15)]">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#F97316] px-3 py-1 rounded-full shadow-sm uppercase tracking-wide">
              Best value
            </span>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-[#0D1117]">Pro</h2>
              <p className="text-sm text-[#56616F] mt-1">The complete Scripwise toolkit.</p>
            </div>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-[#0D1117]">{PRO_PRICE_LABEL}</span>
              <span className="text-sm text-[#8A96A8] ml-1.5">/ year</span>
            </div>
            <p className="text-xs text-[#8A96A8] mb-6">{PRO_PER_MONTH_LABEL}</p>
            <div className="mb-6"><ProCTA /></div>
            <ul className="space-y-3 mt-auto">
              {PRO_HIGHLIGHTS.map((f, i) => (
                <li key={f} className={`flex items-start gap-2.5 text-sm ${i === 0 ? 'text-[#8A96A8] font-medium' : 'text-[#374151]'}`}>
                  {i === 0 ? <span className="w-4 shrink-0" /> : <Check size={16} className="text-[#F97316] shrink-0 mt-0.5" />} {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Full comparison */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="h-section text-[#0D1117] text-center mb-8">Compare plans</h2>
          <div className="card-plain p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EDF0F7]">
                  <th className="text-left text-sm font-semibold text-[#0D1117] px-5 py-4">Feature</th>
                  <th className="text-center text-sm font-semibold text-[#0D1117] px-3 py-4 w-28">Free</th>
                  <th className="text-center text-sm font-semibold text-[#EA580C] px-3 py-4 w-28 bg-[#FFF9F4]">Pro</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_MATRIX.map(group => (
                  <FeatureGroupRows key={group.group} group={group.group} rows={group.rows} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-14">
          <h2 className="h-section text-[#0D1117] text-center mb-8">Questions</h2>
          <div className="space-y-3">
            {FAQ.map(item => (
              <div key={item.q} className="card-plain p-5">
                <div className="flex items-start gap-2.5 mb-1.5">
                  <HelpCircle size={16} className="text-[#F97316] shrink-0 mt-0.5" />
                  <h3 className="text-sm font-semibold text-[#0D1117]">{item.q}</h3>
                </div>
                <p className="text-sm text-[#4A5568] leading-relaxed pl-[26px]">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust / disclaimer band */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs text-[#8A96A8]">
            <ShieldCheck size={14} className="text-[#16A34A]" />
            Secure payments · Cancel anytime · No auto-charge without notice
          </div>
          <p className="text-[11px] text-[#B0B8C4] mt-3 leading-relaxed">
            Scripwise is a research and screening tool and does not provide investment advice. See our{' '}
            <Link href="/terms" className="underline hover:text-[#F97316]">Terms</Link> and{' '}
            <Link href="/disclaimer" className="underline hover:text-[#F97316]">Disclaimer</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureGroupRows({ group, rows }: { group: string; rows: FeatureRow[] }) {
  return (
    <>
      <tr className="bg-[#F7F9FC]">
        <td colSpan={3} className="px-5 py-2 text-[11px] font-semibold text-[#8A96A8] uppercase tracking-wide">
          {group}
        </td>
      </tr>
      {rows.map(row => (
        <tr key={row.label} className="border-b border-[#F0F3F8] last:border-0">
          <td className="px-5 py-3.5">
            <div className="text-sm text-[#0D1117]">{row.label}</div>
            {row.detail && <div className="text-xs text-[#8A96A8] mt-0.5">{row.detail}</div>}
          </td>
          <td className="px-3 py-3.5 text-center"><Cell value={row.free} /></td>
          <td className="px-3 py-3.5 text-center bg-[#FFF9F4]"><Cell value={row.pro} /></td>
        </tr>
      ))}
    </>
  );
}
