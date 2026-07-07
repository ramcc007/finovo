import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Satori (the ImageResponse renderer) has no bold weight without an actual
// font file — fetch Inter Bold once per request rather than bundling a
// binary font asset in the repo.
async function loadInterBold(): Promise<ArrayBuffer> {
  const css = await (await fetch('https://fonts.googleapis.com/css2?family=Inter:wght@700')).text();
  const url = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error('Inter Bold font URL not found');
  return await (await fetch(url)).arrayBuffer();
}

export default async function OGImage() {
  const interBold = await loadInterBold();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: '#0B0E14',
          padding: '80px 96px',
          fontFamily: 'Inter',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 76,
              height: 76,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 7,
              background: 'linear-gradient(135deg, #FB923C, #EA580C)',
              borderRadius: 16,
              padding: '14px 14px 12px',
            }}
          >
            <div style={{ width: 9, height: 18, borderRadius: 3, background: '#fff' }} />
            <div style={{ width: 9, height: 30, borderRadius: 3, background: '#fff' }} />
            <div style={{ width: 9, height: 44, borderRadius: 3, background: '#fff' }} />
          </div>
          <div style={{ display: 'flex', color: '#fff', fontSize: 56, fontWeight: 700 }}>Scripwise</div>
        </div>
        <div style={{ display: 'flex', color: '#fff', fontSize: 44, fontWeight: 700, maxWidth: 920, lineHeight: 1.25 }}>
          Free Indian Stock Screener &amp; Research
        </div>
        <div style={{ display: 'flex', color: 'rgba(255,255,255,0.55)', fontSize: 26, marginTop: 24, maxWidth: 860 }}>
          5,000+ NSE &amp; BSE companies · financial ratios · Scripwise Score · 100% free
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Inter', data: interBold, weight: 700, style: 'normal' }] }
  );
}
