import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 3,
          background: 'linear-gradient(135deg, #FB923C, #EA580C)',
          borderRadius: 7,
          padding: '6px 6px 5px',
        }}
      >
        <div style={{ width: 4, height: 8, borderRadius: 1.5, background: '#fff' }} />
        <div style={{ width: 4, height: 13, borderRadius: 1.5, background: '#fff' }} />
        <div style={{ width: 4, height: 19, borderRadius: 1.5, background: '#fff' }} />
      </div>
    ),
    { ...size }
  );
}
