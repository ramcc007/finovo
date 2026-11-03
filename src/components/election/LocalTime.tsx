'use client';

import { useSyncExternalStore } from 'react';

const ET: Intl.DateTimeFormatOptions = { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };
const noop = () => () => undefined;

/** Renders US Eastern time on the server (for crawlers and no-JS), then the reader's own time zone in the browser. */
export default function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const d = new Date(iso);
  const eastern = d.toLocaleString('en-US', ET);
  const text = useSyncExternalStore(
    noop,
    () => d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }),
    () => eastern,
  );
  return <time dateTime={iso} title={`${eastern} (US Eastern)`} className={className}>{text}</time>;
}
