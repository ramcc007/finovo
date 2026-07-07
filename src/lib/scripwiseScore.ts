/**
 * Scripwise Score — a transparent, rule-based 0–100 read on a company's
 * fundamentals. Every point is traceable to a specific reported metric;
 * there is no model, no external call, and nothing here is inferred beyond
 * simple thresholds and a same-sector comparison. Not investment advice.
 */

export type MetricStatus = 'good' | 'warn' | 'bad' | 'na';

export interface ScoreLine {
  label: string;
  status: MetricStatus;
  detail: string;
  points: number;
  maxPoints: number;
}

export interface ScoreResult {
  score: number;
  maxScore: number;
  band: 'Excellent' | 'Strong' | 'Moderate' | 'Weak' | 'Limited data';
  breakdown: ScoreLine[];
}

export interface ScoreInput {
  pe: number | null;
  pb: number | null;
  roe: number | null;
  roce: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  revenueGrowth1Y: number | null;
  profitGrowth1Y: number | null;
  dividendYield: number | null;
  pledgePct: number | null;
  sectorAvgPe: number | null;
  sectorAvgPb: number | null;
}

function tier(value: number | null, thresholds: [number, number, number], points: [number, number, number, number]): [MetricStatus, number] {
  if (value == null) return ['na', 0];
  if (value >= thresholds[0]) return ['good', points[0]];
  if (value >= thresholds[1]) return ['good', points[1]];
  if (value >= thresholds[2]) return ['warn', points[2]];
  return ['bad', points[3]];
}

export function computeScripwiseScore(input: ScoreInput): ScoreResult {
  const breakdown: ScoreLine[] = [];

  // ── Profitability (30) ──────────────────────────────────────
  {
    const [status, points] = tier(input.roe, [20, 15, 10], [15, 11, 7, 2]);
    breakdown.push({
      label: 'Return on Equity',
      status,
      detail: input.roe != null ? `ROE ${input.roe.toFixed(1)}%` : 'ROE not reported',
      points, maxPoints: 15,
    });
  }
  {
    const [status, points] = tier(input.roce, [20, 15, 10], [15, 11, 7, 2]);
    breakdown.push({
      label: 'Return on Capital Employed',
      status,
      detail: input.roce != null ? `ROCE ${input.roce.toFixed(1)}%` : 'ROCE not reported',
      points, maxPoints: 15,
    });
  }

  // ── Growth (25) ──────────────────────────────────────────────
  {
    const [status, points] = tier(input.revenueGrowth1Y, [15, 8, 0], [12, 8, 4, 0]);
    breakdown.push({
      label: 'Revenue Growth (1Y)',
      status,
      detail: input.revenueGrowth1Y != null ? `${input.revenueGrowth1Y >= 0 ? '+' : ''}${input.revenueGrowth1Y.toFixed(1)}% YoY` : 'Not reported',
      points, maxPoints: 12,
    });
  }
  {
    const [status, points] = tier(input.profitGrowth1Y, [15, 8, 0], [13, 9, 4, 0]);
    breakdown.push({
      label: 'Profit Growth (1Y)',
      status,
      detail: input.profitGrowth1Y != null ? `${input.profitGrowth1Y >= 0 ? '+' : ''}${input.profitGrowth1Y.toFixed(1)}% YoY` : 'Not reported',
      points, maxPoints: 13,
    });
  }

  // ── Valuation vs. sector (20) ────────────────────────────────
  const valuationLine = (label: string, value: number | null, sectorAvg: number | null, maxPoints: number): ScoreLine => {
    if (value == null || sectorAvg == null || sectorAvg <= 0) {
      return { label, status: 'na', detail: 'Not enough sector data', points: 0, maxPoints };
    }
    const ratio = value / sectorAvg;
    let status: MetricStatus, points: number;
    if (ratio <= 0.8) { status = 'good'; points = maxPoints; }
    else if (ratio <= 1.0) { status = 'good'; points = Math.round(maxPoints * 0.7); }
    else if (ratio <= 1.3) { status = 'warn'; points = Math.round(maxPoints * 0.4); }
    else { status = 'bad'; points = Math.round(maxPoints * 0.1); }
    return { label, status, detail: `${value.toFixed(1)}x vs sector avg ${sectorAvg.toFixed(1)}x`, points, maxPoints };
  };
  breakdown.push(valuationLine('P/E vs. Sector', input.pe, input.sectorAvgPe, 10));
  breakdown.push(valuationLine('P/B vs. Sector', input.pb, input.sectorAvgPb, 10));

  // ── Financial health (15) ────────────────────────────────────
  {
    if (input.debtToEquity == null) {
      breakdown.push({ label: 'Debt / Equity', status: 'na', detail: 'Not reported', points: 0, maxPoints: 8 });
    } else if (input.debtToEquity <= 0.3) {
      breakdown.push({ label: 'Debt / Equity', status: 'good', detail: `${input.debtToEquity.toFixed(2)}x — low leverage`, points: 8, maxPoints: 8 });
    } else if (input.debtToEquity <= 0.7) {
      breakdown.push({ label: 'Debt / Equity', status: 'good', detail: `${input.debtToEquity.toFixed(2)}x — moderate`, points: 6, maxPoints: 8 });
    } else if (input.debtToEquity <= 1.5) {
      breakdown.push({ label: 'Debt / Equity', status: 'warn', detail: `${input.debtToEquity.toFixed(2)}x — elevated`, points: 3, maxPoints: 8 });
    } else {
      breakdown.push({ label: 'Debt / Equity', status: 'bad', detail: `${input.debtToEquity.toFixed(2)}x — high leverage`, points: 0, maxPoints: 8 });
    }
  }
  {
    const [status, points] = tier(input.currentRatio, [1.5, 1.0, 0.5], [7, 4, 1, 0]);
    breakdown.push({
      label: 'Current Ratio',
      status,
      detail: input.currentRatio != null ? `${input.currentRatio.toFixed(2)}x` : 'Not reported',
      points, maxPoints: 7,
    });
  }

  // ── Shareholder position (10) ────────────────────────────────
  {
    const [status, points] = tier(input.dividendYield, [3, 1, 0.01], [5, 3, 1, 0]);
    breakdown.push({
      label: 'Dividend Yield',
      status,
      detail: input.dividendYield != null ? `${input.dividendYield.toFixed(2)}%` : 'No dividend reported',
      points, maxPoints: 5,
    });
  }
  {
    if (input.pledgePct == null) {
      breakdown.push({ label: 'Promoter Pledge', status: 'na', detail: 'Not reported', points: 0, maxPoints: 5 });
    } else if (input.pledgePct === 0) {
      breakdown.push({ label: 'Promoter Pledge', status: 'good', detail: 'No shares pledged', points: 5, maxPoints: 5 });
    } else if (input.pledgePct < 5) {
      breakdown.push({ label: 'Promoter Pledge', status: 'warn', detail: `${input.pledgePct.toFixed(1)}% pledged`, points: 3, maxPoints: 5 });
    } else {
      breakdown.push({ label: 'Promoter Pledge', status: 'bad', detail: `${input.pledgePct.toFixed(1)}% pledged`, points: 0, maxPoints: 5 });
    }
  }

  const score = breakdown.reduce((sum, l) => sum + l.points, 0);
  const maxScore = breakdown.reduce((sum, l) => sum + l.maxPoints, 0);
  const naCount = breakdown.filter(l => l.status === 'na').length;

  const pct = (score / maxScore) * 100;
  let band: ScoreResult['band'];
  if (naCount > breakdown.length / 2) band = 'Limited data';
  else if (pct >= 75) band = 'Excellent';
  else if (pct >= 58) band = 'Strong';
  else if (pct >= 40) band = 'Moderate';
  else band = 'Weak';

  return { score: Math.round(pct), maxScore: 100, band, breakdown };
}
