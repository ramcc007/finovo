import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Finovo — how we handle your data.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl font-bold text-[#0D1117] mb-2">Privacy Policy</h1>
      <p className="text-sm text-[#8A96A8] mb-8">Last updated: June 2026</p>

      <div className="space-y-8 text-[#4A5568] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Overview</h2>
          <p className="text-sm">
            Finovo (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights regarding your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Information We Collect</h2>
          <p className="text-sm mb-2">Finovo is a free, no-login-required tool. We collect minimal data:</p>
          <ul className="text-sm space-y-1.5 list-disc list-inside">
            <li><strong>Usage data:</strong> Anonymous page views, search queries (not linked to you personally), and feature usage via analytics.</li>
            <li><strong>Technical data:</strong> Browser type, device type, and IP address (anonymised) via hosting infrastructure logs.</li>
            <li>We do <strong>not</strong> collect your name, email, phone number, or any personally identifiable information unless you voluntarily contact us.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Cookies</h2>
          <p className="text-sm">
            We use essential cookies only — to maintain your session preferences (e.g., selected filters, watchlist). We do not use tracking or advertising cookies. Third-party services we use (Vercel hosting) may set their own cookies governed by their respective privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">How We Use Data</h2>
          <ul className="text-sm space-y-1.5 list-disc list-inside">
            <li>To improve the platform based on aggregate usage patterns</li>
            <li>To monitor and fix technical issues</li>
            <li>We do not sell, rent, or share your data with third parties for marketing purposes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Data Storage</h2>
          <p className="text-sm">
            Market data is stored in a Supabase (PostgreSQL) database. No personal user data is stored in our databases. Hosting is provided by Vercel with servers in global edge locations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Your Rights</h2>
          <p className="text-sm">
            Since we do not collect personal data, there is nothing to request deletion of. If you believe we have inadvertently collected your data, contact us and we will address it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Changes to This Policy</h2>
          <p className="text-sm">
            We may update this policy periodically. Changes will be posted on this page with a revised date. Continued use of the platform constitutes acceptance of the updated policy.
          </p>
        </section>
      </div>
    </div>
  );
}
