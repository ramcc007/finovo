import { getElectionData } from '@/lib/election/db';
import { FAQ, HOW_IT_WORKS, INTRO, PAGE_TITLE, PAGE_URL } from '@/lib/election/content';
import { TAG_LABEL } from '@/lib/election/types';

// A plain-Markdown copy of the page, easy for AI assistants and crawlers to read.
export async function GET() {
  const { updates, meta } = await getElectionData();
  const lines = [
    `# ${PAGE_TITLE}`, '',
    `Status: ${meta?.coverageEnded ? 'Final results' : 'Live'}. URL: ${PAGE_URL}`, '',
    INTRO, '',
    ...(meta?.takeaways.length ? ['## Where things stand', '', ...meta.takeaways.map(t => `- ${t}`), ''] : []),
    '## Updates', '',
    ...updates.slice(0, 100).flatMap(u => [
      `### ${u.headline}`,
      `${u.publishedAt} | ${TAG_LABEL[u.tag]}`, '',
      u.summary,
      ...(u.marketImpact ? ['', `Market impact (${u.marketRegions.join(', ') || 'markets'}): ${u.marketImpact}`] : []),
      '', `Sources: ${u.sources.map(s => `[${s.name}](${s.url})`).join(', ')}`, '',
    ]),
    '## Frequently asked questions', '',
    ...FAQ.flatMap(f => [`**${f.q}**`, f.a, '']),
    '## How this page works', '', HOW_IT_WORKS, '',
    'Disclaimer: news summary only. Not investment advice. Scripwise is not a SEBI-registered investment adviser.',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600' } });
}
