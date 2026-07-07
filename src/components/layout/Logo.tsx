interface Props {
  className?: string;
}

/** Scripwise mark — three ascending bars (a rising chart), the same visual
 * language as the generated favicon/OG image in app/icon.tsx. */
export default function Logo({ className }: Props) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="scripwise-mark" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="#FB923C" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#scripwise-mark)" />
      <rect x="7" y="17" width="4" height="8" rx="1.5" fill="white" />
      <rect x="14" y="12" width="4" height="13" rx="1.5" fill="white" />
      <rect x="21" y="6" width="4" height="19" rx="1.5" fill="white" />
    </svg>
  );
}
