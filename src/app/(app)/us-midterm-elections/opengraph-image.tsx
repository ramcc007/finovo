import { ImageResponse } from 'next/og';
import { OG_SIZE, loadInterBold } from '@/components/blog/ogCard';
import { getElectionData } from '@/lib/election/db';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'US Midterm Elections 2026: live updates and results';

export default async function Image() {
  const [font, { meta }] = await Promise.all([loadInterBold(), getElectionData()]);
  const board = meta?.scoreboard ?? {};
  const rows = ([['senate', 'Senate'], ['house', 'House'], ['governors', 'Governors']] as const).filter(([k]) => board[k]);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0B0E14', padding: '64px 84px', fontFamily: 'Inter' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', color: meta?.coverageEnded ? '#86EFAC' : '#FCA5A5', fontSize: 26, fontWeight: 700, letterSpacing: 2, background: 'rgba(255,255,255,0.08)', padding: '10px 22px', borderRadius: 999 }}>
            {meta?.coverageEnded ? 'FINAL RESULTS' : '● LIVE'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', color: '#fff', fontSize: 68, fontWeight: 700, lineHeight: 1.12 }}>US Midterm Elections 2026: Live Updates</div>
          {rows.length > 0 && (
            <div style={{ display: 'flex', gap: 40 }}>
              {rows.map(([k, label]) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', color: 'rgba(255,255,255,0.55)', fontSize: 24 }}>{label}</div>
                  <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>
                    <span style={{ color: '#60A5FA' }}>D {board[k]?.d ?? '-'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 12px' }}>·</span>
                    <span style={{ color: '#F87171' }}>R {board[k]?.r ?? '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: 30, fontWeight: 700 }}>
          <div style={{ display: 'flex' }}>Scripwise</div>
          <div style={{ display: 'flex', color: 'rgba(255,255,255,0.5)', fontSize: 26 }}>scripwise.co.in</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, ...(font ? { fonts: [{ name: 'Inter', data: font, weight: 700 as const, style: 'normal' as const }] } : {}) },
  );
}
