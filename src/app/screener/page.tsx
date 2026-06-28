'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, Download, RotateCcw, ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn, formatCrores } from '@/lib/utils';

type SortKey = 'market_cap' | 'pe' | 'pb' | 'roe' | 'revenue_growth_1y' | 'profit_growth_1y' | 'debt_to_equity' | 'dividend_yield';

interface Filters {
  sector: string;
  mcapMin: string; mcapMax: string;
  peMin: string; peMax: string;
  pbMin: string; pbMax: string;
  roeMin: string;
  roeMax: string;
  revGrowthMin: string;
  profGrowthMin: string;
  debtEquityMax: string;
  divYieldMin: string;
  promoterMin: string;
  pledgeMax: string;
}

const defaultFilters: Filters = {
  sector: '', mcapMin: '', mcapMax: '', peMin: '', peMax: '',
  pbMin: '', pbMax: '', roeMin: '', roeMax: '', revGrowthMin: '',
  profGrowthMin: '', debtEquityMax: '', divYieldMin: '', promoterMin: '', pledgeMax: '',
};

const SECTORS = ['IT', 'Banking', 'NBFC', 'FMCG', 'Auto', 'Pharma', 'Oil & Gas', 'Power'];

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-[#EDF0F7] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#F4F6FA] transition-colors"
      >
        <span className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp size={14} className="text-[#8A96A8]" /> : <ChevronDown size={14} className="text-[#8A96A8]" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 pt-1">{children}</div>}
    </div>
  );
}

function RangeInput({ label, minKey, maxKey, filters, onChange, unit = '' }: {
  label: string; minKey: keyof Filters; maxKey: keyof Filters;
  filters: Filters; onChange: (k: keyof Filters, v: string) => void; unit?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-[#8A96A8] mb-1.5">{label}{unit && ` (${unit})`}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Min"
          value={filters[minKey]}
          onChange={e => onChange(minKey, e.target.value)}
          className="w-full text-xs bg-[#F4F6FA] border border-[#E2E8F0] rounded-[6px] px-2.5 py-2 text-[#0D1117] placeholder:text-[#8A96A8] outline-none focus:border-[#F97316] transition-colors"
        />
        <span className="text-[#8A96A8] text-xs shrink-0">to</span>
        <input
          type="number"
          placeholder="Max"
          value={filters[maxKey]}
          onChange={e => onChange(maxKey, e.target.value)}
          className="w-full text-xs bg-[#F4F6FA] border border-[#E2E8F0] rounded-[6px] px-2.5 py-2 text-[#0D1117] placeholder:text-[#8A96A8] outline-none focus:border-[#F97316] transition-colors"
        />
      </div>
    </div>
  );
}

function MinInput({ label, filterKey, filters, onChange, unit = '' }: {
  label: string; filterKey: keyof Filters;
  filters: Filters; onChange: (k: keyof Filters, v: string) => void; unit?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-[#8A96A8] mb-1.5">{label}{unit && ` (${unit})`}</label>
      <input
        type="number"
        placeholder="Min value"
        value={filters[filterKey]}
        onChange={e => onChange(filterKey, e.target.value)}
        className="w-full text-xs bg-[#F4F6FA] border border-[#E2E8F0] rounded-[6px] px-2.5 py-2 text-[#0D1117] placeholder:text-[#8A96A8] outline-none focus:border-[#F97316] transition-colors"
      />
    </div>
  );
}

interface ScreenerRow {
  symbol: string; name: string; sector: string; price: number;
  pe: number; pb: number; roe: number; roce: number; market_cap: number;
  debt_to_equity: number; revenue_growth_1y: number; profit_growth_1y: number;
  dividend_yield: number; promoter_pct: number; pledge_pct: number;
}

export default function ScreenerPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortKey, setSortKey] = useState<SortKey>('market_cap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<ScreenerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const PER_PAGE = 20;

  const fetchResults = useCallback(async (f: Filters, sk: SortKey, sd: 'asc' | 'desc', pg: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.sector) params.set('sector', f.sector);
    if (f.mcapMin) params.set('mcap_min', f.mcapMin);
    if (f.mcapMax) params.set('mcap_max', f.mcapMax);
    if (f.peMin) params.set('pe_min', f.peMin);
    if (f.peMax) params.set('pe_max', f.peMax);
    if (f.pbMin) params.set('pb_min', f.pbMin);
    if (f.pbMax) params.set('pb_max', f.pbMax);
    if (f.roeMin) params.set('roe_min', f.roeMin);
    if (f.roeMax) params.set('roe_max', f.roeMax);
    if (f.revGrowthMin) params.set('rev_growth_1y_min', f.revGrowthMin);
    if (f.profGrowthMin) params.set('profit_growth_1y_min', f.profGrowthMin);
    if (f.debtEquityMax) params.set('debt_equity_max', f.debtEquityMax);
    if (f.divYieldMin) params.set('div_yield_min', f.divYieldMin);
    if (f.promoterMin) params.set('promoter_min', f.promoterMin);
    if (f.pledgeMax) params.set('pledge_max', f.pledgeMax);
    params.set('sort_by', sk);
    params.set('sort_dir', sd);
    params.set('page', String(pg));
    params.set('per_page', String(PER_PAGE));

    try {
      const res = await fetch(`/api/screener?${params}`);
      const data = await res.json();
      setResults(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(filters, sortKey, sortDir, page);
  }, [filters, sortKey, sortDir, page, fetchResults]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => { setFilters(defaultFilters); setPage(1); };

  const totalPages = Math.ceil(total / PER_PAGE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-[#E2E8F0]">↕</span>;
    return sortDir === 'desc' ? <ChevronDown size={12} className="text-[#F97316]" /> : <ChevronUp size={12} className="text-[#F97316]" />;
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="h-section text-[#0D1117]">Stock Explorer</h1>
            <p className="text-sm text-[#4A5568] mt-1.5">Filter 5,000+ NSE &amp; BSE companies across 47 metrics.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeFilterCount > 0 && (
              <span className="hidden sm:inline text-xs bg-[#FFF7ED] text-[#F97316] border border-[#FFEDD5] px-2.5 py-1 rounded-full font-semibold tnum">{activeFilterCount} active</span>
            )}
            <button onClick={() => {}} className="btn btn-secondary !px-3 !py-2 !text-[13px]">
              <Download size={13} /> <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className="lg:hidden btn btn-secondary w-full mb-4 justify-between"
        >
          <span className="flex items-center gap-2"><SlidersHorizontal size={15} className="text-[#F97316]" /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
          {showFilters ? <X size={16} /> : <ChevronDown size={16} />}
        </button>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Filter Panel */}
          <div className={cn('w-full lg:w-[280px] shrink-0', showFilters ? 'block' : 'hidden lg:block')}>
            <div className="card-plain overflow-hidden lg:sticky lg:top-20">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDF0F7]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-[#F97316]" />
                  <span className="text-sm font-semibold text-[#0D1117]">Filters</span>
                </div>
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-[#4A5568] hover:text-[#DC2626] transition-colors">
                  <RotateCcw size={11} /> Clear all
                </button>
              </div>

              <div className="max-h-[calc(100vh-160px)] overflow-y-auto">
                <FilterSection title="Classification">
                  <div>
                    <label className="block text-xs text-[#8A96A8] mb-1.5">Sector</label>
                    <select
                      value={filters.sector}
                      onChange={e => updateFilter('sector', e.target.value)}
                      className="w-full text-xs bg-[#F4F6FA] border border-[#E2E8F0] rounded-[6px] px-2.5 py-2 text-[#0D1117] outline-none focus:border-[#F97316] transition-colors"
                    >
                      <option value="">All Sectors</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <RangeInput label="Market Cap" minKey="mcapMin" maxKey="mcapMax" filters={filters} onChange={updateFilter} unit="₹ Cr" />
                </FilterSection>

                <FilterSection title="Valuation">
                  <RangeInput label="P/E Ratio" minKey="peMin" maxKey="peMax" filters={filters} onChange={updateFilter} />
                  <RangeInput label="P/B Ratio" minKey="pbMin" maxKey="pbMax" filters={filters} onChange={updateFilter} />
                  <MinInput label="Dividend Yield" filterKey="divYieldMin" filters={filters} onChange={updateFilter} unit="%" />
                </FilterSection>

                <FilterSection title="Profitability">
                  <RangeInput label="ROE" minKey="roeMin" maxKey="roeMax" filters={filters} onChange={updateFilter} unit="%" />
                </FilterSection>

                <FilterSection title="Growth">
                  <MinInput label="Revenue Growth 1Y" filterKey="revGrowthMin" filters={filters} onChange={updateFilter} unit="%" />
                  <MinInput label="Profit Growth 1Y" filterKey="profGrowthMin" filters={filters} onChange={updateFilter} unit="%" />
                </FilterSection>

                <FilterSection title="Financial Health">
                  <div>
                    <label className="block text-xs text-[#8A96A8] mb-1.5">Debt/Equity (Max)</label>
                    <input
                      type="number"
                      placeholder="e.g. 0.5"
                      value={filters.debtEquityMax}
                      onChange={e => updateFilter('debtEquityMax', e.target.value)}
                      className="w-full text-xs bg-[#F4F6FA] border border-[#E2E8F0] rounded-[6px] px-2.5 py-2 text-[#0D1117] placeholder:text-[#8A96A8] outline-none focus:border-[#F97316] transition-colors"
                    />
                  </div>
                </FilterSection>

                <FilterSection title="Shareholding">
                  <MinInput label="Promoter Holding" filterKey="promoterMin" filters={filters} onChange={updateFilter} unit="%" />
                  <div>
                    <label className="block text-xs text-[#8A96A8] mb-1.5">Max Pledge % (0 = No Pledge)</label>
                    <input
                      type="number"
                      placeholder="e.g. 0"
                      value={filters.pledgeMax}
                      onChange={e => updateFilter('pledgeMax', e.target.value)}
                      className="w-full text-xs bg-[#F4F6FA] border border-[#E2E8F0] rounded-[6px] px-2.5 py-2 text-[#0D1117] placeholder:text-[#8A96A8] outline-none focus:border-[#F97316] transition-colors"
                    />
                  </div>
                </FilterSection>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#4A5568]">
                {loading
                  ? <span className="text-[#8A96A8]">Loading...</span>
                  : <><span className="num font-semibold text-[#0D1117]">{total}</span> companies found</>
                }
              </p>
            </div>

            <div className="card p-0 overflow-auto">
              <table className="data-table min-w-[700px]">
                <thead>
                  <tr>
                    <th className="text-left">Company</th>
                    {[
                      { key: 'market_cap', label: 'Mkt Cap' },
                      { key: 'pe', label: 'P/E' },
                      { key: 'pb', label: 'P/B' },
                      { key: 'roe', label: 'ROE %' },
                      { key: 'revenue_growth_1y', label: 'Rev Gr 1Y' },
                      { key: 'profit_growth_1y', label: 'Pft Gr 1Y' },
                      { key: 'debt_to_equity', label: 'D/E' },
                      { key: 'dividend_yield', label: 'Div Yield' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key as SortKey)}
                        className="cursor-pointer select-none hover:text-[#0D1117] transition-colors"
                      >
                        <span className="flex items-center justify-end gap-1">
                          {col.label} <SortIcon col={col.key as SortKey} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array(8).fill(0).map((_, i) => (
                      <tr key={i}>
                        {Array(9).fill(0).map((_, j) => (
                          <td key={j}><div className="h-4 bg-[#EEF1F7] rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-[#8A96A8] font-sans">
                        No stocks match your filters. Try relaxing the criteria.
                      </td>
                    </tr>
                  ) : results.map(s => (
                    <tr key={s.symbol} className="group">
                      <td>
                        <Link href={`/stocks/${s.symbol}`}>
                          <div className="font-semibold text-[#0D1117] group-hover:text-[#F97316] transition-colors">{s.symbol}</div>
                          <div className="text-[11px] text-[#8A96A8] font-sans mt-0.5 max-w-[180px] truncate">{s.name}</div>
                        </Link>
                      </td>
                      <td>{s.market_cap ? formatCrores(s.market_cap) : '—'}</td>
                      <td className={!s.pe ? '' : s.pe < 15 ? 'text-positive' : s.pe > 35 ? 'text-negative' : ''}>{s.pe ? `${s.pe}x` : '—'}</td>
                      <td className={!s.pb ? '' : s.pb < 2 ? 'text-positive' : s.pb > 10 ? 'text-negative' : ''}>{s.pb ? `${s.pb}x` : '—'}</td>
                      <td className={!s.roe ? '' : s.roe > 20 ? 'text-positive' : s.roe < 10 ? 'text-negative' : ''}>{s.roe ? `${s.roe}%` : '—'}</td>
                      <td className={s.revenue_growth_1y == null ? '' : s.revenue_growth_1y >= 0 ? 'text-positive' : 'text-negative'}>{s.revenue_growth_1y != null ? `${s.revenue_growth_1y >= 0 ? '+' : ''}${s.revenue_growth_1y}%` : '—'}</td>
                      <td className={s.profit_growth_1y == null ? '' : s.profit_growth_1y >= 0 ? 'text-positive' : 'text-negative'}>{s.profit_growth_1y != null ? `${s.profit_growth_1y >= 0 ? '+' : ''}${s.profit_growth_1y}%` : '—'}</td>
                      <td className={!s.debt_to_equity ? '' : s.debt_to_equity < 0.5 ? 'text-positive' : s.debt_to_equity > 2 ? 'text-negative' : ''}>{s.debt_to_equity != null ? `${s.debt_to_equity}x` : '—'}</td>
                      <td>{s.dividend_yield != null ? `${s.dividend_yield}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs px-3 py-1.5 border border-[#E2E8F0] rounded-[6px] text-[#4A5568] disabled:opacity-40 hover:border-[#F97316] hover:text-[#F97316] transition-colors"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'text-xs w-8 h-8 rounded-[6px] transition-colors',
                      page === p ? 'bg-[#F97316] text-white' : 'border border-[#E2E8F0] text-[#4A5568] hover:border-[#F97316]'
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-xs px-3 py-1.5 border border-[#E2E8F0] rounded-[6px] text-[#4A5568] disabled:opacity-40 hover:border-[#F97316] hover:text-[#F97316] transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
