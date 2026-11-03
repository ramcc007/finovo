import { getElectionData } from '@/lib/election/db';
import { anchorOf } from '@/components/election/LiveTimeline';
import { PAGE_DESCRIPTION, PAGE_TITLE, PAGE_URL } from '@/lib/election/content';
import { TAG_LABEL } from '@/lib/election/types';

// JSON Feed 1.1: https://www.jsonfeed.org/version/1.1/
export async function GET() {
  const { updates } = await getElectionData();
  const body = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${PAGE_TITLE} | Scripwise`,
    home_page_url: PAGE_URL,
    feed_url: `${PAGE_URL}/feed.json`,
    description: PAGE_DESCRIPTION,
    language: 'en',
    hubs: [{ type: 'WebSub', url: 'https://pubsubhubbub.appspot.com/' }],
    items: updates.slice(0, 100).map(u => ({
      id: `scripwise-election-${u.id}`,
      url: `${PAGE_URL}#${anchorOf(u.id)}`,
      title: u.headline,
      content_text: u.marketImpact ? `${u.summary}\n\nMarket impact: ${u.marketImpact}` : u.summary,
      date_published: u.publishedAt,
      tags: [TAG_LABEL[u.tag], ...u.marketRegions],
      authors: [{ name: 'Scripwise Desk' }],
      external_url: u.sources[0]?.url,
    })),
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/feed+json; charset=utf-8', 'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600' } });
}
