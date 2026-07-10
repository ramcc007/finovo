import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy',
  description: 'Refund and cancellation terms for the Scripwise Pro subscription.',
};

export default function RefundPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl font-bold text-[#0D1117] mb-2">Refund &amp; Cancellation Policy</h1>
      <p className="text-sm text-[#8A96A8] mb-8">Last updated: July 2026</p>

      <div className="space-y-8 text-[#4A5568] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Scripwise Pro</h2>
          <p className="text-sm">
            Scripwise Pro is a digital subscription priced at ₹499 per year. Payment unlocks all
            Pro features on your account immediately and for the full subscription year.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Cancellation</h2>
          <p className="text-sm">
            You may cancel your subscription at any time from your account&apos;s profile page, or by
            contacting us. On cancellation, your subscription simply stops renewing at the end of the
            current paid year — you retain full Pro access until that date. There is no cancellation
            fee.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Refunds</h2>
          <p className="text-sm">
            Because Pro is a digital product that is unlocked and usable immediately upon payment,
            subscription fees are non-refundable once the plan is active. We encourage you to explore
            the Free tier first — it needs no payment details and lets you evaluate the core product
            before upgrading.
          </p>
          <p className="text-sm mt-3">
            In the rare event of a duplicate charge, a billing error, or a failed activation where Pro
            was charged but not delivered, contact us within 7 days and we will investigate and issue a
            refund for the erroneous amount where appropriate.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">How refunds are processed</h2>
          <p className="text-sm">
            Approved refunds are returned to the original payment method via our payment processor and
            typically settle within 5–7 business days, subject to your bank or card issuer.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Contact</h2>
          <p className="text-sm">
            For any billing question or refund request, please reach us via our{' '}
            <a href="/contact" className="text-[#F97316] hover:underline">Contact page</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
