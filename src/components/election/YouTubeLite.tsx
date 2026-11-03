'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { youtubeEmbedSrc, youtubeWatchUrl } from '@/lib/election/media';

/** Click-to-play YouTube player. Nothing is loaded from YouTube until the reader presses play. */
export default function YouTubeLite({ kind, id, title, credit, dark = false }: { kind: 'video' | 'live'; id: string; title: string; credit: string; dark?: boolean }) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="m-0">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[#0B0E14] ring-1 ring-black/10">
        {playing ? (
          <iframe src={youtubeEmbedSrc(kind, id)} title={title} className="absolute inset-0 h-full w-full" loading="lazy"
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} aria-label={`Play video: ${title}`}
            className="group absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1F2937] via-[#111827] to-[#7C2D12] text-white">
            {kind === 'video' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {kind === 'live' && <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live</span>}
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#F97316] shadow-lg transition-transform group-hover:scale-110"><Play size={24} fill="currentColor" aria-hidden /></span>
            <span className="absolute inset-x-3 bottom-2.5 line-clamp-2 text-left text-sm font-semibold drop-shadow">{title}</span>
          </button>
        )}
      </div>
      <figcaption className={`mt-1.5 text-[12px] ${dark ? 'text-white/50' : 'text-[#8A96A8]'}`}>
        Video: {credit} on <a href={youtubeWatchUrl(kind, id)} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold underline decoration-current/30 underline-offset-2 hover:text-[#EA580C]">YouTube ↗</a>
      </figcaption>
    </figure>
  );
}
