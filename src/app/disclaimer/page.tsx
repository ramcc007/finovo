import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: 'Important disclaimer regarding the use of Scripwise stock market data and research tools.',
};

export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl font-bold text-[#0D1117] mb-2">Disclaimer</h1>
      <p className="text-sm text-[#8A96A8] mb-8">Last updated: June 2026</p>

      <div className="bg-[#FFF7ED] border border-[#FFEDD5] border-l-4 border-l-[#F97316] rounded-lg p-4 mb-8">
        <p className="text-sm font-semibold text-[#C45A00]">
          Scripwise is a free informational tool only. It is NOT a SEBI-registered investment advisor, broker, or research analyst. Nothing on this platform constitutes investment advice.
        </p>
      </div>

      <div className="space-y-8 text-[#4A5568] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">No Investment Advice</h2>
          <p className="text-sm">
            All content, data, tools, screeners, and analysis available on Scripwise are provided solely for educational and informational purposes. Nothing on this website should be construed as investment advice, a recommendation to buy or sell any security, or a solicitation of any investment decision. Always consult a qualified financial advisor before making any investment.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Data Accuracy</h2>
          <p className="text-sm">
            While we strive to provide accurate and up-to-date information, Scripwise does not warrant the completeness, accuracy, timeliness, or reliability of any data displayed on this platform. Financial data is sourced from publicly available feeds and may contain errors, delays, or omissions. We are not responsible for any decisions made based on this data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">No Liability</h2>
          <p className="text-sm">
            Scripwise, its creators, and contributors shall not be held liable for any direct, indirect, incidental, special, or consequential damages arising from your use of this platform, including but not limited to financial losses, missed opportunities, or errors in data. Use this platform entirely at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Past Performance</h2>
          <p className="text-sm">
            Any historical data, returns, or performance metrics shown are for informational purposes only. Past performance of a stock or screener result is not indicative of future performance. Stock markets are subject to market risk. You may lose part or all of your invested capital.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0D1117] mb-3">Third-Party Data</h2>
          <p className="text-sm">
            Data on Scripwise is sourced from publicly available sources including NSE, BSE, and financial data providers. Scripwise is not affiliated with NSE, BSE, SEBI, or any data vendor. All trademarks and logos belong to their respective owners.
          </p>
        </section>
      </div>
    </div>
  );
}
