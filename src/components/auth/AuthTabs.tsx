import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props {
  active: 'signup' | 'login';
}

export default function AuthTabs({ active }: Props) {
  return (
    <div className="grid grid-cols-2 gap-1 bg-[#F4F6FA] border border-[#E2E8F0] rounded-lg p-1 mb-6">
      <Link
        href="/signup"
        className={cn(
          'text-center text-sm font-semibold rounded-md py-2 transition-colors',
          active === 'signup' ? 'bg-white text-[#0D1117] shadow-sm' : 'text-[#4A5568] hover:text-[#0D1117]'
        )}
      >
        Sign up
      </Link>
      <Link
        href="/login"
        className={cn(
          'text-center text-sm font-semibold rounded-md py-2 transition-colors',
          active === 'login' ? 'bg-white text-[#0D1117] shadow-sm' : 'text-[#4A5568] hover:text-[#0D1117]'
        )}
      >
        Log in
      </Link>
    </div>
  );
}
