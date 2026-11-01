import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const pageHref = (n: number) => (n <= 1 ? '/blog' : `/blog/page/${n}`);

export default function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const base = 'inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors';
  return (
    <nav aria-label="Blog pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={pageHref(page - 1)} rel="prev" className={`${base} border-[#E5E7EB] bg-white text-[#0D1117] hover:border-[#F97316]`}>
          <ChevronLeft size={16} /> Previous
        </Link>
      )}
      {pages.map(n => (
        <Link key={n} href={pageHref(n)} aria-current={n === page ? 'page' : undefined}
          className={`${base} ${n === page ? 'border-[#F97316] bg-[#F97316] text-white' : 'border-[#E5E7EB] bg-white text-[#0D1117] hover:border-[#F97316]'}`}>
          {n}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={pageHref(page + 1)} rel="next" className={`${base} border-[#E5E7EB] bg-white text-[#0D1117] hover:border-[#F97316]`}>
          Next <ChevronRight size={16} />
        </Link>
      )}
    </nav>
  );
}
