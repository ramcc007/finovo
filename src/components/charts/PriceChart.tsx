'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  symbol: string;
  currentPrice: number;
}

const PERIODS = ['1D', '1W', '1M', '6M', '1Y', '5Y'] as const;
type Period = typeof PERIODS[number];

export default function PriceChart({ symbol, currentPrice }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  // Keep latest currentPrice in a ref so fetchPrices never has a stale closure.
  const currentPriceRef = useRef(currentPrice);
  useEffect(() => { currentPriceRef.current = currentPrice; }, [currentPrice]);

  // Track the live chart instance so we can safely remove it before re-creating.
  const chartRef = useRef<{ remove: () => void } | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const [period, setPeriod] = useState<Period>('1Y');
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceChange, setPriceChange] = useState({ value: 0, pct: 0 });

  const fetchPrices = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const price = currentPriceRef.current;
      const priceParam = price > 0 ? `&price=${price}` : '';
      const res = await fetch(`/api/stocks/${symbol}/prices?period=${p}${priceParam}`);
      const data: PricePoint[] = await res.json();
      setPrices(data);

      if (data.length >= 2) {
        const first = data[0].close;
        const last = data[data.length - 1].close;
        const change = last - first;
        setPriceChange({ value: +change.toFixed(2), pct: +(first > 0 ? (change / first) * 100 : 0).toFixed(2) });
      }
    } catch {
      setPrices([]);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => { fetchPrices(period); }, [period, fetchPrices]);

  useEffect(() => {
    if (!chartContainerRef.current || prices.length === 0) return;

    // Tear down previous chart and ResizeObserver before creating a new one.
    roRef.current?.disconnect();
    roRef.current = null;
    chartRef.current?.remove();
    chartRef.current = null;

    let cancelled = false;

    import('lightweight-charts').then(({ createChart, ColorType, CrosshairMode, CandlestickSeries, AreaSeries, HistogramSeries }) => {
      if (cancelled || !chartContainerRef.current) return;

      const el = chartContainerRef.current;
      const chart = createChart(el, {
        width: el.clientWidth || 600,
        height: el.clientHeight || 256,
        layout: {
          background: { type: ColorType.Solid, color: '#FFFFFF' },
          textColor: '#56616F',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: '#EEF1F7' },
          horzLines: { color: '#EEF1F7' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: '#F97316', labelBackgroundColor: '#F97316' },
          horzLine: { color: '#F97316', labelBackgroundColor: '#F97316' },
        },
        rightPriceScale: {
          borderColor: '#E2E8F0',
          scaleMargins: { top: 0.1, bottom: 0.3 },
        },
        timeScale: {
          borderColor: '#E2E8F0',
          timeVisible: true,
        },
        handleScroll: true,
        handleScale: true,
      });

      chartRef.current = chart;

      const isPositive = priceChange.pct >= 0;
      const lineColor = isPositive ? '#16A34A' : '#DC2626';
      const areaTopColor = isPositive ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)';

      const timeData = prices.map(p => ({
        time: p.date as `${number}-${number}-${number}`,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        value: p.close,
      }));

      if (chartType === 'candle') {
        const cs = chart.addSeries(CandlestickSeries, {
          upColor: '#16A34A',
          downColor: '#DC2626',
          borderUpColor: '#16A34A',
          borderDownColor: '#DC2626',
          wickUpColor: '#16A34A',
          wickDownColor: '#DC2626',
          priceScaleId: 'right',
        });
        cs.setData(timeData);
      } else {
        const as = chart.addSeries(AreaSeries, {
          lineColor,
          topColor: areaTopColor,
          bottomColor: 'rgba(255,255,255,0)',
          lineWidth: 2,
          priceScaleId: 'right',
        });
        as.setData(timeData);
      }

      // Volume bars
      const vs = chart.addSeries(HistogramSeries, {
        color: '#C7D2FE',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
        borderVisible: false,
      });
      vs.setData(prices.map(p => ({
        time: p.date as `${number}-${number}-${number}`,
        value: p.volume,
        color: p.close >= p.open ? 'rgba(22,163,74,0.4)' : 'rgba(220,38,38,0.4)',
      })));

      // Resize to real container dimensions, then fit.
      const sync = () => {
        if (el.clientWidth > 0) {
          chart.resize(el.clientWidth, el.clientHeight, true);
          chart.timeScale().fitContent();
        }
      };
      sync();
      requestAnimationFrame(sync);

      const ro = new ResizeObserver(entries => {
        if (entries[0]) {
          const { width, height } = entries[0].contentRect;
          chart.resize(width, height, true);
        }
      });
      ro.observe(el);
      roRef.current = ro;
    });

    return () => {
      cancelled = true;
      roRef.current?.disconnect();
      roRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices, chartType]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Period buttons */}
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded transition-colors',
                  period === p ? 'bg-[#F97316] text-white' : 'text-[#4A5568] hover:bg-[#EEF1F7]'
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Period return */}
          {!loading && prices.length > 1 && (
            <span className={cn(
              'text-xs font-mono font-semibold px-2 py-0.5 rounded',
              priceChange.pct >= 0 ? 'badge-positive' : 'badge-negative'
            )}>
              {priceChange.pct >= 0 ? '▲' : '▼'} {Math.abs(priceChange.pct).toFixed(2)}%
            </span>
          )}
        </div>

        {/* Chart type toggle */}
        <div className="flex gap-1 bg-[#EEF1F7] p-0.5 rounded-[6px]">
          {(['line', 'candle'] as const).map(t => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className={cn(
                'text-[11px] font-medium px-2.5 py-1 rounded-[5px] transition-colors capitalize',
                chartType === t ? 'bg-white text-[#0D1117] shadow-sm' : 'text-[#4A5568]'
              )}
            >
              {t === 'line' ? '📈 Line' : '🕯 Candle'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-[#8A96A8] text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
            Loading chart...
          </div>
        </div>
      ) : prices.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-[#8A96A8] text-sm">
          No price data available for this period
        </div>
      ) : (
        <div ref={chartContainerRef} className="h-64 w-full" />
      )}
    </div>
  );
}
