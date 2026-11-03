import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

export async function loadInterBold(): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=Inter:wght@700')).text();
    const url = css.match(/src: url\(([^)]+)\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Text-only share card: category, title and Scripwise branding. */
export async function renderPostCard(title: string, category: string): Promise<ImageResponse> {
  const font = await loadInterBold();
  const size = title.length > 80 ? 52 : 62;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0B0E14', padding: '72px 84px', fontFamily: 'Inter' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', color: '#FB923C', fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', background: 'rgba(249,115,22,0.15)', padding: '10px 22px', borderRadius: 999 }}>
            {category}
          </div>
        </div>
        <div style={{ display: 'flex', color: '#fff', fontSize: size, fontWeight: 700, lineHeight: 1.18, maxWidth: 1030 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, background: 'linear-gradient(135deg, #FB923C, #EA580C)', borderRadius: 12, padding: '10px 10px 9px' }}>
              <div style={{ width: 7, height: 12, borderRadius: 2, background: '#fff' }} />
              <div style={{ width: 7, height: 20, borderRadius: 2, background: '#fff' }} />
              <div style={{ width: 7, height: 30, borderRadius: 2, background: '#fff' }} />
            </div>
            <div style={{ display: 'flex', color: '#fff', fontSize: 34, fontWeight: 700 }}>Scripwise Blog</div>
          </div>
          <div style={{ display: 'flex', color: 'rgba(255,255,255,0.5)', fontSize: 26 }}>scripwise.co.in</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, ...(font ? { fonts: [{ name: 'Inter', data: font, weight: 700 as const, style: 'normal' as const }] } : {}) }
  );
}
