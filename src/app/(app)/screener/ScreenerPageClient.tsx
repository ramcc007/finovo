'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, Download, RotateCcw, ChevronUp, ChevronDown, X, Bookmark, Trash2, Gauge, Lock } from 'lucide-react';
import { cn, formatCrores, formatPrice, toCSV, downloadTextFile } from '@/lib/utils';
import AdviceDisclaimer from '@/components/ui/AdviceDisclaimer';
import { useSavedScreens } from '@/lib/useSavedScreens';
import { useEntitlement } from '@/lib/useEntitlement';

type SortKey = 'market_cap' | 'price' | 'pe' | 'pb' | 'roe' | 'revenue_growth_1y' | 'profit_growth_1y' | 'debt_to_equity' | 'dividend_yield' | 'scripwise_score';

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
  scoreMin: string;
}

const defaultFilters: Filters = {
  sector: '', mcapMin: '', mcapMax: '', peMin: '', peMax: '',
  pbMin: '', pbMax: '', roeMin: '', roeMax: '', revGrowthMin: '',
  profGrowthMin: '', debtEquityMax: '', divYieldMin: '', promoterMin: '', pledgeMax: '',
  scoreMin: '',
};

// One-click filter presets — each just sets a subset of the filter panel's
// own state, so they compose with (and can be overridden by) manual filters.
const QUICK_FILTERS: { label: string; patch: Partial<Filters> }[] = [
  { label: 'Low P/E', patch: { peMax: '15' } },
  { label: 'High ROE', patch: { roeMin: '20' } },
  { label: 'Zero debt', patch: { debtEquityMax: '0.1' } },
  { label: 'Strong Scripwise Score', patch: { scoreMin: '75' } },
];

// Must match the canonical sector labels written by scripts/ingest_companies.py
// (SECTOR_FILES + INDUSTRY_MAP). The old list included 'NBFC', which the
// ingester maps to 'Banking' — selecting it always returned zero stocks —
// and omitted 14 real sectors entirely.
const SECTORS = [
  'Auto', 'Banking', 'Capital Goods', 'Cement', 'Chemicals', 'Consumer',
  'Diversified', 'FMCG', 'IT', 'Insurance', 'Logistics', 'Media', 'Metal',
  'Oil & Gas', 'Other', 'Pharma', 'Power', 'Realty', 'Retail', 'Services',
  'Telecom', 'Textiles',
];

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

function ProLockBadge() {
  return (
    <Link
      href="/pricing"
      className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#F97316] bg-[#FFF3E8] px-1.5 py-0.5 rounded-full ml-1.5 align-middle hover:bg-[#FFE8D4] transition-colors"
      title="Requires Scripwise Pro"
    >
      <Lock size={8} /> PRO
    </Link>
  );
}

function RangeInput({ label, minKey, maxKey, filters, onChange, unit = '', locked = false }: {
  label: string; minKey: keyof Filters; maxKey: keyof Filters;
  filters: Filters; onChange: (k: keyof Filters, v: string) => void; unit?: string; locked?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-[#8A96A8] mb-1.5">
        {label}{unit && ` (${unit})`}{locked && <ProLockBadge />}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder={locked ? 'Pro' : 'Min'}
          value={locked ? '' : filters[minKey]}
          onChange={e => !locked && onChange(minKey, e.target.value)}
          disabled={locked}
          className="w-full text-xs bg-[#F4F6FA] border border-[#E2E8F0] rounded-[6px] px-2.5 py-2 text-[#0D1117] placeholder:text-[#8A96A8] outline-none focus:border-[#F97316] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="text-[#8A96A8] text-xs shrink-0">to</span>
        <input
          type="number"
          placeholder={locked ? 'Pro' : 'Max'}
          value={locked ? '' : filters[maxKey]}
          onChange={e => !locked && onChange(maxKey, e.target.value)}
          disabled={locked}
          className="w-full text-xs bg-[#F4F6FA] border border-[#E2E8F0] rounded-[6px] px-2.5 py-2 text-[#0D1117] placeholder:text-[#8A96A8] outline-none focus:border-[#F97316] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

function MinInput({ label, filterKey, filters, onChange, unit = '', locked = false }: {
  label: string; filterKey: keyof Filters;
  filters: Filters; onChange: (k: keyof Filters, v: string) => void; unit?: string; locked?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-[#8A96A8] mb-1.5">
        {label}{unit && ` (${unit})`}{locked && <ProLockBadge />}
      </label>
      <input
        type="number"
        placeholder={locked ? 'Requires Pro' : 'Min value'}
        value={locked ? '' : filters[filterKey]}
        onChange={e => !locked && onChange(filterKey, e.target.value)}
        disabled={locked}
        className="w-full text-xs bg-[#F4F6FA] border border-[#E2E8F0] rounded-[6px] px-2.5 py-2 text-[#0D1117] placeholder:text-[#8A96A8] outline-none focus:border-[#F97316] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

interface ScreenerRow {
  symbol: string; name: string; sector: string; price: number; change_pct: number;
  pe: number; pb: number; roe: number; roce: number; market_cap: number;
  debt_to_equity: number; revenue_growth_1y: number; profit_growth_1y: number;
  dividend_yield: number; promoter_pct: number; pledge_pct: number;
  scripwise_score?: number;
}

// Maps the /api/screener query-param names (used by pre-built screen links)
// straight onto the filter panel's internal state keys.
const PARAM_TO_FILTER_KEY: Record<string, keyof Filters> = {
  sector: 'sector',
  mcap_min: 'mcapMin', mcap_max: 'mcapMax',
  pe_min: 'peMin', pe_max: 'peMax',
  pb_min: 'pbMin', pb_max: 'pbMax',
  roe_min: 'roeMin', roe_max: 'roeMax',
  rev_growth_1y_min: 'revGrowthMin',
  profit_growth_1y_min: 'profGrowthMin',
  debt_equity_max: 'debtEquityMax',
  div_yield_min: 'divYieldMin',
  promoter_min: 'promoterMin',
  pledge_max: 'pledgeMax',
  score_min: 'scoreMin',
};

const SCORE_BAND_COLOR = (score: number): string =>
  score >= 75 ? 'text-positive' : score >= 40 ? 'text-[#D97706]' : 'text-negative';

function ScreenerPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilters = (): Filters => {
    const f = { ...defaultFilters };
    for (const [param, key] of Object.entries(PARAM_TO_FILTER_KEY)) {
      const v = searchParams.get(param);
      if (v) f[key] = v;
    }
    return f;
  };

  const ent = useEntitlement();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [sortKey, setSortKey] = useState<SortKey>((searchParams.get('sort_by') as SortKey) || 'market_cap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc');
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
    if (f.scoreMin) params.set('score_min', f.scoreMin);
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

  const applyQuickFilter = (patch: Partial<Filters>) => {
    setFilters(f => ({ ...f, ...patch }));
    setPage(1);
  };

  const [exporting, setExporting] = useState(false);
  const exportCSV = async () => {
    if (!ent.active) { router.push('/pricing?locked=csv'); return; }
    setExporting(true);
    const params = new URLSearchParams();
    if (filters.sector) params.set('sector', filters.sector);
    if (filters.mcapMin) params.set('mcap_min', filters.mcapMin);
    if (filters.mcapMax) params.set('mcap_max', filters.mcapMax);
    if (filters.peMin) params.set('pe_min', filters.peMin);
    if (filters.peMax) params.set('pe_max', filters.peMax);
    if (filters.pbMin) params.set('pb_min', filters.pbMin);
    if (filters.pbMax) params.set('pb_max', filters.pbMax);
    if (filters.roeMin) params.set('roe_min', filters.roeMin);
    if (filters.roeMax) params.set('roe_max', filters.roeMax);
    if (filters.revGrowthMin) params.set('rev_growth_1y_min', filters.revGrowthMin);
    if (filters.profGrowthMin) params.set('profit_growth_1y_min', filters.profGrowthMin);
    if (filters.debtEquityMax) params.set('debt_equity_max', filters.debtEquityMax);
    if (filters.divYieldMin) params.set('div_yield_min', filters.divYieldMin);
    if (filters.promoterMin) params.set('promoter_min', filters.promoterMin);
    if (filters.pledgeMax) params.set('pledge_max', filters.pledgeMax);
    if (filters.scoreMin) params.set('score_min', filters.scoreMin);
    params.set('sort_by', sortKey);
    params.set('sort_dir', sortDir);
    params.set('page', '1');
    params.set('per_page', '2000');

    try {
      const res = await fetch(`/api/screener?${params}`);
      const data = await res.json();
      const rows: ScreenerRow[] = data.data ?? [];
      const csv = toCSV(rows as unknown as Record<string, unknown>[], [
        { key: 'symbol', label: 'Symbol' },
        { key: 'name', label: 'Name' },
        { key: 'sector', label: 'Sector' },
        { key: 'price', label: 'Price' },
        { key: 'market_cap', label: 'Market Cap (Cr)' },
        { key: 'pe', label: 'P/E' },
        { key: 'pb', label: 'P/B' },
        { key: 'roe', label: 'ROE %' },
        { key: 'revenue_growth_1y', label: 'Revenue Growth 1Y %' },
        { key: 'profit_growth_1y', label: 'Profit Growth 1Y %' },
        { key: 'debt_to_equity', label: 'Debt/Equity' },
        { key: 'dividend_yield', label: 'Dividend Yield %' },
        { key: 'scripwise_score', label: 'Scripwise Score' },
      ]);
      downloadTextFile(`scripwise-screener-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } finally {
      setExporting(false);
    }
  };

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

  const { screens: savedScreens, save: saveScreen, remove: removeScreen, atLimit: savedScreensAtLimit, limit: savedScreensLimit } = useSavedScreens();
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [showSavedList, setShowSavedList] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveLimitNote, setSaveLimitNote] = useState(false);

  const applySavedScreen = (s: (typeof savedScreens)[number]) => {
    setFilters({ ...defaultFilters, ...s.filters });
    setSortKey(s.sortKey as SortKey);
    setSortDir(s.sortDir);
    setPage(1);
    setShowSavedList(false);
  };

  const handleSaveScreen = () => {
    const name = saveName.trim();
    if (!name) return;
    const saved = saveScreen(name, { ...filters }, sortKey, sortDir);
    if (!saved) { setSaveLimitNote(true); return; }
    setSaveName('');
    setShowSavePanel(false);
    setSaveLimitNote(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <AdviceDisclaimer />
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="h-section text-[#0D1117]">Stock Explorer</h1>
            <p className="text-sm text-[#4A5568] mt-1.5">Filter 5,000+ NSE &amp; BSE companies across 47 metrics.</p>
            <p className="text-[11px] text-[#8A96A8] mt-1">
              Fundamentals from each company&apos;s latest reported results · price at last market close
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeFilterCount > 0 && (
              <span className="hidden sm:inline text-xs bg-[#FFF7ED] text-[#F97316] border border-[#FFEDD5] px-2.5 py-1 rounded-full font-semibold tnum">{activeFilterCount} active</span>
            )}
            <div className="relative">
              <button
                onClick={() => { setShowSavedList(v => !v); setShowSavePanel(false); }}
                className="btn btn-secondary !px-3 !py-2 !text-[13px]"
              >
                <Bookmark size={13} /> <span className="hidden sm:inline">Saved{savedScreens.length > 0 ? ` (${savedScreens.length})` : ''}</span>
              </button>
              {showSavedList && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-[#E2E8F0] rounded-xl shadow-[0_12px_32px_rgba(16,24,40,0.14)] z-20 overflow-hidden">
                  {savedScreens.length === 0 ? (
                    <p className="text-xs text-[#8A96A8] px-4 py-4">No saved screens yet. Set some filters and click &quot;Save this screen&quot;.</p>
                  ) : savedScreens.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[#FAFBFD] border-b border-[#F0F3F8] last:border-0">
                      <button onClick={() => applySavedScreen(s)} className="text-sm text-left text-[#0D1117] font-medium flex-1 truncate">
                        {s.name}
                      </button>
                      <button onClick={() => removeScreen(s.id)} className="text-[#8A96A8] hover:text-[#DC2626] p-2 -m-1 shrink-0" aria-label={`Delete ${s.name}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => { setShowSavePanel(v => !v); setShowSavedList(false); }}
                className="btn btn-secondary !px-3 !py-2 !text-[13px]"
              >
                <SlidersHorizontal size={13} /> <span className="hidden sm:inline">Save this screen</span>
              </button>
              {showSavePanel && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-[#E2E8F0] rounded-xl shadow-[0_12px_32px_rgba(16,24,40,0.14)] z-20 p-3">
                  {savedScreensAtLimit ? (
                    <p className="text-xs text-[#4A5568] leading-relaxed">
                      Free plan is limited to {savedScreensLimit} saved screen.{' '}
                      <Link href="/pricing" className="text-[#F97316] font-medium hover:underline">Upgrade to Pro</Link> for unlimited.
                    </p>
                  ) : (
                    <>
                      <label className="block text-xs text-[#8A96A8] mb-1.5">Name this screen</label>
                      <input
                        autoFocus
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveScreen(); }}
                        placeholder="e.g. My high-ROE picks"
                        className="w-full text-sm bg-[#F4F6FA] border border-[#E2E8F0] rounded-[6px] px-2.5 py-2 outline-none focus:border-[#F97316] mb-2.5"
                      />
                      <button onClick={handleSaveScreen} className="btn btn-primary w-full !text-xs !py-1.5">Save</button>
                      {saveLimitNote && (
                        <p className="text-xs text-[#DC2626] mt-2">Could not save — you&apos;ve reached the Free plan limit.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <button onClick={exportCSV} disabled={exporting} className="btn btn-secondary !px-3 !py-2 !text-[13px] disabled:opacity-60">
              {ent.active ? <Download size={13} /> : <Lock size={13} />} <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export CSV'}</span>
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
                  <RangeInput label="P/B Ratio" minKey="pbMin" maxKey="pbMax" filters={filters} onChange={updateFilter} locked={!ent.active} />
                  <MinInput label="Dividend Yield" filterKey="divYieldMin" filters={filters} onChange={updateFilter} unit="%" locked={!ent.active} />
                </FilterSection>

                <FilterSection title="Profitability">
                  <RangeInput label="ROE" minKey="roeMin" maxKey="roeMax" filters={filters} onChange={updateFilter} unit="%" />
                </FilterSection>

                <FilterSection title="Growth">
                  <MinInput label="Revenue Growth 1Y" filterKey="revGrowthMin" filters={filters} onChange={updateFilter} unit="%" locked={!ent.active} />
                  <MinInput label="Profit Growth 1Y" filterKey="profGrowthMin" filters={filters} onChange={updateFilter} unit="%" locked={!ent.active} />
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
                  {/* Shareholding data isn't ingested yet — a promoter/pledge
                      filter here would silently match nothing. Re-enable the
                      inputs once the shareholding pipeline exists. */}
                  <p className="text-xs text-[#8A96A8] leading-relaxed">
                    Promoter holding &amp; pledge filters are coming soon — quarterly
                    shareholding data isn&apos;t available yet.
                  </p>
                </FilterSection>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {QUICK_FILTERS.map(qf => {
                const active = Object.entries(qf.patch).every(([k, v]) => filters[k as keyof Filters] === v);
                return (
                  <button
                    key={qf.label}
                    onClick={() => applyQuickFilter(active ? Object.fromEntries(Object.keys(qf.patch).map(k => [k, ''])) : qf.patch)}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-full border transition-colors font-medium',
                      active
                        ? 'bg-[#F97316] border-[#F97316] text-white'
                        : 'bg-white border-[#E2E8F0] text-[#4A5568] hover:border-[#F97316] hover:text-[#F97316]'
                    )}
                  >
                    {qf.label}
                  </button>
                );
              })}
            </div>

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
                      { key: 'price', label: 'Price (₹)' },
                      { key: 'market_cap', label: 'Mkt Cap' },
                      { key: 'pe', label: 'P/E' },
                      { key: 'pb', label: 'P/B' },
                      { key: 'roe', label: 'ROE %' },
                      { key: 'revenue_growth_1y', label: 'Rev Gr 1Y' },
                      { key: 'profit_growth_1y', label: 'Pft Gr 1Y' },
                      { key: 'debt_to_equity', label: 'D/E' },
                      { key: 'dividend_yield', label: 'Div Yield' },
                      { key: 'scripwise_score', label: 'Score' },
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
                        {Array(11).fill(0).map((_, j) => (
                          <td key={j}><div className="h-4 bg-[#EEF1F7] rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-[#8A96A8] font-sans">
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
                      <td>
                        {s.price != null ? formatPrice(s.price) : '—'}
                        {s.change_pct != null && (
                          <div className={cn('text-[11px] font-medium', s.change_pct >= 0 ? 'text-positive' : 'text-negative')}>
                            {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                          </div>
                        )}
                      </td>
                      <td>{s.market_cap ? formatCrores(s.market_cap) : '—'}</td>
                      <td className={!s.pe ? '' : s.pe < 15 ? 'text-positive' : s.pe > 35 ? 'text-negative' : ''}>{s.pe ? `${s.pe.toFixed(1)}x` : '—'}</td>
                      <td className={!s.pb ? '' : s.pb < 2 ? 'text-positive' : s.pb > 10 ? 'text-negative' : ''}>{s.pb ? `${s.pb.toFixed(1)}x` : '—'}</td>
                      <td className={!s.roe ? '' : s.roe > 20 ? 'text-positive' : s.roe < 10 ? 'text-negative' : ''}>{s.roe ? `${s.roe.toFixed(1)}%` : '—'}</td>
                      <td className={s.revenue_growth_1y == null ? '' : s.revenue_growth_1y >= 0 ? 'text-positive' : 'text-negative'}>{s.revenue_growth_1y != null ? `${s.revenue_growth_1y >= 0 ? '+' : ''}${s.revenue_growth_1y.toFixed(1)}%` : '—'}</td>
                      <td className={s.profit_growth_1y == null ? '' : s.profit_growth_1y >= 0 ? 'text-positive' : 'text-negative'}>{s.profit_growth_1y != null ? `${s.profit_growth_1y >= 0 ? '+' : ''}${s.profit_growth_1y.toFixed(1)}%` : '—'}</td>
                      <td className={!s.debt_to_equity ? '' : s.debt_to_equity < 0.5 ? 'text-positive' : s.debt_to_equity > 2 ? 'text-negative' : ''}>{s.debt_to_equity != null ? `${s.debt_to_equity.toFixed(2)}x` : '—'}</td>
                      <td>{s.dividend_yield != null ? `${s.dividend_yield.toFixed(2)}%` : '—'}</td>
                      <td className={s.scripwise_score != null ? cn('font-semibold', SCORE_BAND_COLOR(s.scripwise_score)) : ''}>
                        {s.scripwise_score != null ? (
                          <Link href={`/stocks/${s.symbol}`} className="inline-flex items-center gap-1 hover:underline">
                            <Gauge size={11} /> {s.scripwise_score}
                          </Link>
                        ) : '—'}
                      </td>
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

export default function ScreenerPageClient() {
  return (
    <Suspense fallback={null}>
      <ScreenerPageInner />
    </Suspense>
  );
}
