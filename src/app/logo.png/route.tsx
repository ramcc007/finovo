import { ImageResponse } from 'next/og';

// 512x512 brand mark for structured data (Google asks for an organization logo of at least 112px;
// the favicon is only 32px). Same artwork as the favicon, scaled up.
export const dynamic = 'force-static';

export function GET() {
  const k = 16;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3 * k,
          background: 'linear-gradient(135deg, #FB923C, #EA580C)', borderRadius: 7 * k, padding: `${6 * k}px ${6 * k}px ${5 * k}px`,
        }}
      >
        <div style={{ width: 4 * k, height: 8 * k, borderRadius: 1.5 * k, background: '#fff' }} />
        <div style={{ width: 4 * k, height: 13 * k, borderRadius: 1.5 * k, background: '#fff' }} />
        <div style={{ width: 4 * k, height: 19 * k, borderRadius: 1.5 * k, background: '#fff' }} />
      </div>
    ),
    { width: 512, height: 512 },
  );
}
