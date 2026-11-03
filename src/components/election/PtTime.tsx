const FMT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };

/** A time shown in US Pacific Time (PT), the same for every reader; hover shows US Eastern. */
// Some engines put a narrow no-break space before AM/PM. Normalising keeps server and browser output identical.
const plain = (v: string) => v.replace(/[\u202f\u00a0]/g, ' ');

export default function PtTime({ iso, className }: { iso: string; className?: string }) {
  const d = new Date(iso);
  return (
    <time dateTime={iso} title={`${plain(d.toLocaleString('en-US', { ...FMT, timeZone: 'America/New_York' }))} (US Eastern)`} className={className}>
      {plain(d.toLocaleString('en-US', { ...FMT, timeZone: 'America/Los_Angeles' }))}
    </time>
  );
}
