import { slugify } from '@/lib/blog';

export const categoryHref = (category: string) => `/blog/category/${slugify(category)}`;
