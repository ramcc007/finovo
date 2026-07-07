import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 16,
          background: 'linear-gradient(135deg, #FB923C, #EA580C)',
          padding: '34px 30px 28px',
        }}
      >
        <div style={{ width: 22, height: 44, borderRadius: 8, background: '#fff' }} />
        <div style={{ width: 22, height: 73, borderRadius: 8, background: '#fff' }} />
        <div style={{ width: 22, height: 108, borderRadius: 8, background: '#fff' }} />
      </div>
    ),
    { ...size }
  );
}
