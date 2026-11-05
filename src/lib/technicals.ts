// Price-history figures for the stock page. Pure functions over daily bars, oldest first.

export interface Bar { date: string; close: number; high: number; low: number; volume: number }

export interface Technicals {
  asOf: string;
  last: number;
  returns: { label: string; pct: number | null }[];
  fromHigh52: number | null; // % below the 52-week high (negative or zero)
  fromLow52: number | null;  // % above the 52-week low
  sma50: number | null; sma200: number | null;
  vsSma50: number | null; vsSma200: number | null; // % above (+) or below (-) the average
  rsi14: number | null;
  avgVolume20: number | null; avgVolume50: number | null;
  volumeVsAvg: number | null; // latest volume as a multiple of the 20-day average
  volatility1y: number | null; // annualised standard deviation of daily returns, in %
}

const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function sma(bars: Bar[], n: number): number | null {
  return bars.length >= n ? mean(bars.slice(-n).map(b => b.close)) : null;
}

/** Wilder's RSI over `n` periods. */
function rsi(bars: Bar[], n = 14): number | null {
  if (bars.length < n + 1) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = bars[i].close - bars[i - 1].close;
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= n; loss /= n;
  for (let i = n + 1; i < bars.length; i++) {
    const d = bars[i].close - bars[i - 1].close;
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
  }
  if (loss === 0) return 100;
  return round(100 - 100 / (1 + gain / loss), 0);
}

/** Close on or before `daysBack` calendar days before the last bar, or null if history does not reach that far. */
function closeAgo(bars: Bar[], daysBack: number): number | null {
  const last = bars[bars.length - 1];
  const target = new Date(last.date + 'T00:00:00Z').getTime() - daysBack * 86_400_000;
  if (new Date(bars[0].date + 'T00:00:00Z').getTime() > target + 5 * 86_400_000) return null; // not enough history
  for (let i = bars.length - 1; i >= 0; i--) {
    if (new Date(bars[i].date + 'T00:00:00Z').getTime() <= target) return bars[i].close;
  }
  return null;
}

export function computeTechnicals(barsIn: Bar[]): Technicals | null {
  const bars = barsIn.filter(b => b.close > 0).sort((a, b) => a.date.localeCompare(b.date));
  if (bars.length < 20) return null;
  const lastBar = bars[bars.length - 1];
  const last = lastBar.close;

  const ret = (label: string, days: number) => {
    const c = closeAgo(bars, days);
    return { label, pct: c ? round(((last - c) / c) * 100, 1) : null };
  };

  const year = bars.filter(b => new Date(b.date + 'T00:00:00Z').getTime() >= new Date(lastBar.date + 'T00:00:00Z').getTime() - 365 * 86_400_000);
  const hi = Math.max(...year.map(b => b.high || b.close));
  const lo = Math.min(...year.map(b => b.low || b.close));

  const s50 = sma(bars, 50), s200 = sma(bars, 200);
  const v20 = bars.length >= 20 ? mean(bars.slice(-20).map(b => b.volume)) : null;
  const v50 = bars.length >= 50 ? mean(bars.slice(-50).map(b => b.volume)) : null;

  const rets = year.slice(1).map((b, i) => Math.log(b.close / year[i].close)).filter(isFinite);
  const sd = rets.length > 30 ? Math.sqrt(mean(rets.map(r => (r - mean(rets)) ** 2))) : null;

  return {
    asOf: lastBar.date,
    last,
    returns: [ret('1W', 7), ret('1M', 30), ret('3M', 91), ret('6M', 182), ret('1Y', 365), ret('3Y', 1095), ret('5Y', 1825)],
    fromHigh52: hi > 0 ? round(((last - hi) / hi) * 100, 1) : null,
    fromLow52: lo > 0 ? round(((last - lo) / lo) * 100, 1) : null,
    sma50: s50 != null ? round(s50, 2) : null,
    sma200: s200 != null ? round(s200, 2) : null,
    vsSma50: s50 ? round(((last - s50) / s50) * 100, 1) : null,
    vsSma200: s200 ? round(((last - s200) / s200) * 100, 1) : null,
    rsi14: rsi(bars),
    avgVolume20: v20 != null ? Math.round(v20) : null,
    avgVolume50: v50 != null ? Math.round(v50) : null,
    volumeVsAvg: v20 && lastBar.volume ? round(lastBar.volume / v20, 1) : null,
    volatility1y: sd != null ? round(sd * Math.sqrt(252) * 100, 1) : null,
  };
}
