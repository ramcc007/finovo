'use client';

import type { PulseZone } from '@/lib/pulse';

interface Props {
  score: number; // 0..100
  zone: PulseZone;
  size?: number;
}

// Five sentiment bands, drawn left (fear) to right (greed) across a semicircle.
const BANDS: { zone: PulseZone; from: number; to: number; color: string }[] = [
  { zone: 'Extreme Fear', from: 0, to: 25, color: '#DC2626' },
  { zone: 'Fear', from: 25, to: 45, color: '#F97316' },
  { zone: 'Neutral', from: 45, to: 55, color: '#94A3B8' },
  { zone: 'Greed', from: 55, to: 75, color: '#22C55E' },
  { zone: 'Extreme Greed', from: 75, to: 100, color: '#16A34A' },
];

// Map a 0–100 value to an angle on a 180° arc (180° = left/0, 0° = right/100).
const angleFor = (v: number) => Math.PI * (1 - v / 100);

function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const a0 = angleFor(from);
  const a1 = angleFor(to);
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy - r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy - r * Math.sin(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
}

export default function PulseGauge({ score, zone, size = 280 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 22;
  const activeColor = BANDS.find(b => b.zone === zone)?.color ?? '#94A3B8';

  const needleAngle = angleFor(Math.max(0, Math.min(100, score)));
  const nx = cx + (r - 6) * Math.cos(needleAngle);
  const ny = cy - (r - 6) * Math.sin(needleAngle);

  return (
    <svg viewBox={`0 0 ${size} ${size * 0.62}`} className="w-full" role="img" aria-label={`Scripwise Pulse ${score}, ${zone}`}>
      {BANDS.map(b => (
        <path
          key={b.zone}
          d={arcPath(cx, cy, r, b.from, b.to)}
          fill="none"
          stroke={b.color}
          strokeWidth={16}
          strokeLinecap="butt"
          opacity={b.zone === zone ? 1 : 0.28}
        />
      ))}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={activeColor} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={7} fill={activeColor} />

      {/* Score + zone */}
      <text x={cx} y={cy - 34} textAnchor="middle" className="fill-[#0D1117]" style={{ fontSize: 42, fontWeight: 800 }}>
        {score}
      </text>
      <text x={cx} y={cy - 12} textAnchor="middle" style={{ fontSize: 13, fontWeight: 600, fill: activeColor }}>
        {zone}
      </text>

      {/* End labels */}
      <text x={cx - r} y={cy + 20} textAnchor="middle" style={{ fontSize: 10, fill: '#8A96A8' }}>Fear</text>
      <text x={cx + r} y={cy + 20} textAnchor="middle" style={{ fontSize: 10, fill: '#8A96A8' }}>Greed</text>
    </svg>
  );
}
