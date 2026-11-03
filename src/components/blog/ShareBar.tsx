'use client';

import { useState } from 'react';
import { Link2, Check, Share2 } from 'lucide-react';

type Network = 'x' | 'linkedin' | 'facebook' | 'whatsapp' | 'instagram' | 'tiktok';

// Brand marks (single-path, 24×24). Instagram is drawn from primitives.
function Mark({ n }: { n: Network | 'copy' }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true as const };
  switch (n) {
    case 'x':
      return <svg {...common} fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>;
    case 'linkedin':
      return <svg {...common} fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" /></svg>;
    case 'facebook':
      return <svg {...common} fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" /></svg>;
    case 'whatsapp':
      return <svg {...common} fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>;
    case 'instagram':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={2.2}>
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
          <circle cx="12" cy="12" r="4.3" />
          <circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'tiktok':
      return <svg {...common} fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>;
    default:
      return null;
  }
}

const withUtm = (url: string, source: string) =>
  `${url}?utm_source=${source}&utm_medium=social&utm_campaign=blog_share`;

/** End-of-article share row. X, LinkedIn, Facebook and WhatsApp use their
 *  official share URLs. Instagram and TikTok have no web share URL, so those
 *  open the device share sheet where available (mobile) and otherwise copy
 *  the link with a short how-to. */
export default function ShareBar({ url, title, compact = false }: { url: string; title: string; compact?: boolean }) {
  const [status, setStatus] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const copy = async (link: string, message: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setStatus(message);
      setTimeout(() => { setCopied(false); setStatus(''); }, 4000);
    } catch {
      setStatus('Could not copy automatically — copy the address from your browser bar.');
    }
  };

  const appShare = async (n: 'instagram' | 'tiktok') => {
    const link = withUtm(url, n);
    const label = n === 'instagram' ? 'Instagram' : 'TikTok';
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title, url: link });
        return;
      } catch {
        // cancelled or unsupported — fall back to copying
      }
    }
    const where = n === 'instagram' ? 'a story link sticker, your bio or a DM' : 'your bio, a video caption or a DM';
    await copy(link, `Link copied. Open ${label} and paste it into ${where}.`);
  };

  const enc = encodeURIComponent;
  const links: { n: Network; label: string; href: string; cls: string }[] = [
    { n: 'x', label: 'X (Twitter)', href: `https://x.com/intent/tweet?url=${enc(withUtm(url, 'x'))}&text=${enc(title)}`, cls: 'bg-black text-white hover:bg-[#1f1f1f]' },
    { n: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(withUtm(url, 'linkedin'))}`, cls: 'bg-[#0A66C2] text-white hover:bg-[#0957a6]' },
    { n: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(withUtm(url, 'facebook'))}`, cls: 'bg-[#1877F2] text-white hover:bg-[#1468d8]' },
    { n: 'whatsapp', label: 'WhatsApp', href: `https://api.whatsapp.com/send?text=${enc(`${title} ${withUtm(url, 'whatsapp')}`)}`, cls: 'bg-[#25D366] text-white hover:bg-[#1fb857]' },
  ];
  const btn = 'inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2';

  if (compact) {
    const icon = 'inline-flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]';
    return (
      <div>
        <div role="group" aria-label="Share this page" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/60"><Share2 size={14} aria-hidden /> Share</span>
          {links.map(l => (
            <a key={l.n} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${l.label}`} title={l.label} className={`${icon} ${l.cls}`} data-share={l.n}><Mark n={l.n} /></a>
          ))}
          <button type="button" onClick={() => appShare('instagram')} aria-label="Share on Instagram" title="Instagram" data-share="instagram"
            className={`${icon} bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white`}><Mark n="instagram" /></button>
          <button type="button" onClick={() => appShare('tiktok')} aria-label="Share on TikTok" title="TikTok" data-share="tiktok"
            className={`${icon} bg-[#010101] text-white ring-1 ring-white/20`}><Mark n="tiktok" /></button>
          <button type="button" onClick={() => copy(withUtm(url, 'copy'), 'Link copied to clipboard.')} aria-label="Copy link" title="Copy link" data-share="copy"
            className={`${icon} bg-white text-[#0D1117]`}>{copied ? <Check size={18} className="text-[#16A34A]" aria-hidden /> : <Link2 size={18} aria-hidden />}</button>
        </div>
        <p role="status" aria-live="polite" className="mt-2 min-h-4 text-xs text-white/70">{status}</p>
      </div>
    );
  }

  return (
    <section aria-labelledby="share" className="mt-12 rounded-2xl border border-[#E5E7EB] bg-white p-5 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Share2 size={18} className="text-[#EA580C]" aria-hidden />
        <h3 id="share" className="text-lg font-bold text-[#0D1117]">Share this article</h3>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
        {links.map(l => (
          <a key={l.n} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${l.label}`} className={`${btn} ${l.cls}`} data-share={l.n}>
            <Mark n={l.n} /><span>{l.label === 'X (Twitter)' ? 'X' : l.label}</span>
          </a>
        ))}
        <button type="button" onClick={() => appShare('instagram')} aria-label="Share on Instagram" data-share="instagram"
          className={`${btn} bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white hover:brightness-110`}>
          <Mark n="instagram" /><span>Instagram</span>
        </button>
        <button type="button" onClick={() => appShare('tiktok')} aria-label="Share on TikTok" data-share="tiktok"
          className={`${btn} bg-[#010101] text-white hover:bg-[#1f1f1f]`}>
          <Mark n="tiktok" /><span>TikTok</span>
        </button>
        <button type="button" onClick={() => copy(withUtm(url, 'copy'), 'Link copied to clipboard.')} aria-label="Copy link" data-share="copy"
          className={`${btn} col-span-2 border border-[#E5E7EB] bg-white text-[#0D1117] hover:border-[#F97316] sm:col-span-1`}>
          {copied ? <Check size={18} className="text-[#16A34A]" aria-hidden /> : <Link2 size={18} aria-hidden />}
          <span>{copied ? 'Copied' : 'Copy link'}</span>
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-[#4A5568]">{status}</p>
    </section>
  );
}
