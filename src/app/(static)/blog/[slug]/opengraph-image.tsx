import { getPublishedPost } from '@/lib/blogDb';
import { renderPostCard, OG_SIZE } from '@/components/blog/ogCard';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Scripwise blog article';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedPost((await params).slug);
  return renderPostCard(post?.title ?? 'Scripwise Blog', post?.category ?? 'Blog');
}
