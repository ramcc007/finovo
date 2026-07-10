import type { Metadata } from 'next';
import { Mail, MessageSquare, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the Scripwise team for support, billing, or general questions.',
};

const SUPPORT_EMAIL = 'support@scripwise.co.in';

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl font-bold text-[#0D1117] mb-2">Contact Us</h1>
      <p className="text-sm text-[#4A5568] mb-8 leading-relaxed">
        Questions about your account, billing, or the product? We&apos;re happy to help.
      </p>

      <div className="space-y-4">
        <div className="card-plain p-5 flex items-start gap-3">
          <Mail size={18} className="text-[#F97316] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-[#0D1117]">Email</h2>
            <p className="text-sm text-[#4A5568] mt-0.5">
              Reach us at{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#F97316] hover:underline">{SUPPORT_EMAIL}</a>{' '}
              for support, billing, and refund requests.
            </p>
          </div>
        </div>

        <div className="card-plain p-5 flex items-start gap-3">
          <MessageSquare size={18} className="text-[#F97316] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-[#0D1117]">Billing &amp; subscriptions</h2>
            <p className="text-sm text-[#4A5568] mt-0.5">
              For anything related to Scripwise Pro — upgrades, cancellations, or a charge you don&apos;t
              recognise — email us with the address on your account and we&apos;ll sort it out. See our{' '}
              <a href="/refund" className="text-[#F97316] hover:underline">Refund &amp; Cancellation Policy</a>.
            </p>
          </div>
        </div>

        <div className="card-plain p-5 flex items-start gap-3">
          <Clock size={18} className="text-[#F97316] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-[#0D1117]">Response time</h2>
            <p className="text-sm text-[#4A5568] mt-0.5">
              We aim to respond within 1–2 business days.
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#B0B8C4] mt-8 leading-relaxed">
        Scripwise is a research and screening tool and does not provide investment advice. For any
        market-related decision, please consult a SEBI-registered advisor.
      </p>
    </div>
  );
}
