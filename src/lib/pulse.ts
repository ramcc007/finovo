/**
 * Scripwise Pulse — a transparent 0–100 read on broad-market sentiment,
 * built entirely from our own EOD data. No external index, no black box:
 * every point traces to real market breadth and price positioning across
 * the tracked universe. Read it contrarian, like a fear/greed gauge —
 * extreme fear has historically marked bottoms, extreme greed tops.
 * Not investment advice.
 */

export type PulseZone = 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';

export interface PulseComponent {
  key: string;
  label: string;
  weight: number; // 0..1 (before renormalisation for missing inputs)
  value: number; // 0..100 sub-score
  detail: string; // plain-language explanation with the real numbers behind it
}

export interface PulseResult {
  score: number; // 0..100 weighted composite
  zone: PulseZone;
  components: PulseComponent[];
  sampleSize: number;
  asOf: string | null;
}

export interface PulseInput {
  advances: number; // stocks up on the day
  declines: number; // stocks down on the day
  upperHalf: number; // stocks trading in the top half of their 52-week range
  ranged: number; // stocks with a valid 52-week range to position against
  nearHigh: number; // stocks within ~2% of their 52-week high
  nearLow: number; // stocks within ~2% of their 52-week low
  indexChangePct: number | null; // benchmark index move on the day (%)
  sampleSize: number;
  asOf: string | null;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function zoneFor(score: number): PulseZone {
  if (score < 25) return 'Extreme Fear';
  if (score < 45) return 'Fear';
  if (score <= 55) return 'Neutral';
  if (score < 75) return 'Greed';
  return 'Extreme Greed';
}

export function computePulse(input: PulseInput): PulseResult {
  const components: PulseComponent[] = [];

  // 1. Advance / decline breadth — the share of the market rising today.
  const adTotal = input.advances + input.declines;
  const breadth = adTotal > 0 ? (input.advances / adTotal) * 100 : 50;
  components.push({
    key: 'breadth',
    label: 'Advance / decline breadth',
    weight: 0.3,
    value: clamp(breadth),
    detail: adTotal > 0
      ? `${input.advances.toLocaleString()} up vs ${input.declines.toLocaleString()} down today`
      : 'No priced movers today',
  });

  // 2. 52-week range position — the share of stocks in the upper half of
  //    their own yearly range. A medium-term strength read, not just today.
  const rangePos = input.ranged > 0 ? (input.upperHalf / input.ranged) * 100 : 50;
  components.push({
    key: 'range',
    label: '52-week range position',
    weight: 0.4,
    value: clamp(rangePos),
    detail: input.ranged > 0
      ? `${Math.round(rangePos)}% of ${input.ranged.toLocaleString()} stocks are in the top half of their 52-week range`
      : 'Not enough 52-week data',
  });

  // 3. New highs vs new lows — momentum at the extremes.
  const hlTotal = input.nearHigh + input.nearLow;
  const highsLows = hlTotal > 0 ? 50 + 50 * ((input.nearHigh - input.nearLow) / hlTotal) : 50;
  components.push({
    key: 'highslows',
    label: 'New highs vs new lows',
    weight: 0.15,
    value: clamp(highsLows),
    detail: hlTotal > 0
      ? `${input.nearHigh} near 52-week highs vs ${input.nearLow} near lows`
      : 'No stocks near their 52-week extremes',
  });

  // 4. Benchmark momentum — the day's move on the headline index. Optional:
  //    if the index feed is missing, this component drops out and the rest
  //    are renormalised so the score is still on a clean 0–100 scale.
  if (input.indexChangePct != null) {
    const momentum = 50 + input.indexChangePct * 10; // +5% -> 100, -5% -> 0
    components.push({
      key: 'momentum',
      label: 'Benchmark momentum',
      weight: 0.15,
      value: clamp(momentum),
      detail: `Headline index ${input.indexChangePct >= 0 ? '+' : ''}${input.indexChangePct.toFixed(2)}% today`,
    });
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const score = Math.round(components.reduce((s, c) => s + c.value * c.weight, 0) / totalWeight);

  return {
    score,
    zone: zoneFor(score),
    components,
    sampleSize: input.sampleSize,
    asOf: input.asOf,
  };
}
