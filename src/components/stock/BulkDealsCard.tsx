import { cn, formatTradeDate } from '@/lib/utils';

export interface Deal { trade_date: string; client: string; side: 'BUY' | 'SELL'; quantity: number; price: number | null; deal_type: 'bulk' | 'block' }

const fmtQty = (q: number) => (q >= 10_000_000 ? `${(q / 10_000_000).toFixed(2)} Cr` : q >= 100_000 ? `${(q / 100_000).toFixed(2)} L` : q.toLocaleString('en-IN'));
const fmtValue = (q: number, p: number | null) => {
  if (p == null) return '—';
  const cr = (q * p) / 10_000_000;
  return `₹ ${cr >= 100 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
};

/** Large trades the exchange reports separately: bulk deals (over 0.5% of shares) and block deals. Hidden when none are on record. */
export default function BulkDealsCard({ deals }: { deals: Deal[] }) {
  if (deals.length === 0) return null;
  return (
    <section className="card p-5" aria-labelledby="bd-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="bd-h" className="text-xs font-semibold uppercase tracking-wide text-[#4A5568]">Bulk and block deals</h3>
        <span className="text-[11px] text-[#8A96A8]">Last 90 days, as reported by NSE</span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="data-table min-w-[560px]">
          <thead>
            <tr><th className="text-left">Date</th><th className="text-left">Client</th><th>Buy / Sell</th><th>Shares</th><th>Avg price</th><th>Value</th></tr>
          </thead>
          <tbody>
            {deals.map((d, i) => (
              <tr key={`${d.trade_date}-${d.client}-${i}`}>
                <td className="text-left">{formatTradeDate(d.trade_date)}<span className="ml-1.5 rounded bg-[#F4F6FA] px-1.5 py-0.5 font-sans text-[10px] text-[#8A96A8]">{d.deal_type}</span></td>
                <td className="max-w-[260px] truncate text-left font-sans text-xs text-[#4A5568]" title={d.client}>{d.client}</td>
                <td><span className={cn('font-semibold', d.side === 'BUY' ? 'text-positive' : 'text-negative')}>{d.side === 'BUY' ? 'Buy' : 'Sell'}</span></td>
                <td>{fmtQty(d.quantity)}</td>
                <td>{d.price != null ? `₹ ${d.price.toLocaleString('en-IN')}` : '—'}</td>
                <td>{fmtValue(d.quantity, d.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[#8A96A8]">A bulk deal is a trade of more than 0.5% of a company&apos;s shares in one day. Who buys or sells does not say where the price goes next. Information only, not a recommendation.</p>
    </section>
  );
}
