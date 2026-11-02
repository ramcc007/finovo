import { getPublishedTerm } from '@/lib/glossaryDb';
import { renderPostCard, OG_SIZE } from '@/components/blog/ogCard';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Scripwise glossary term';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const term = await getPublishedTerm((await params).slug);
  return renderPostCard(term?.title ?? 'Scripwise Glossary', 'Glossary');
}
