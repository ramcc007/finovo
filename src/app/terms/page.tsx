import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms and conditions for using Finovo stock research platform.',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl font-bold text-[#0D1117] mb-2">Terms of Use</h1>
      <p className="text-sm text-[#8A96A8] mb-8">Last updated: June 2026</p>

      <div className="space-y-8 text-[#4A5568] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Acceptance of Terms</h2>
          <p className="text-sm">
            By accessing or using Finovo (&quot;the Platform&quot;), you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, please discontinue use of the platform immediately.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Use of the Platform</h2>
          <ul className="text-sm space-y-1.5 list-disc list-inside">
            <li>Finovo is provided free of charge for personal, non-commercial informational use only.</li>
            <li>You may not scrape, crawl, or mass-download data from this platform via automated means.</li>
            <li>You may not use this platform for any unlawful purpose or in violation of applicable Indian laws.</li>
            <li>You may not redistribute, resell, or commercially exploit any data from this platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Not a Financial Service</h2>
          <p className="text-sm">
            Finovo is not a SEBI-registered investment advisor, stockbroker, portfolio manager, or research analyst. The platform does not provide personalised investment advice. All data and tools are for informational and educational purposes only. See our <a href="/disclaimer" className="text-[#F97316] hover:underline">Disclaimer</a> for full details.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Intellectual Property</h2>
          <p className="text-sm">
            The Finovo brand, logo, design, and original content are the property of their respective creators. Market data displayed is sourced from publicly available feeds and remains the property of the respective exchanges and data providers. NSE and BSE are registered trademarks of their respective organisations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Limitation of Liability</h2>
          <p className="text-sm">
            To the maximum extent permitted by applicable law, Finovo and its creators shall not be liable for any loss or damage of any kind arising from your use of the platform, including financial losses, data inaccuracies, or service interruptions. The platform is provided &quot;as is&quot; without any warranties, express or implied.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Modifications</h2>
          <p className="text-sm">
            We reserve the right to modify, suspend, or discontinue the platform at any time without notice. We may also update these terms at any time, with continued use constituting acceptance of the revised terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Governing Law</h2>
          <p className="text-sm">
            These terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of India.
          </p>
        </section>
      </div>
    </div>
  );
}
