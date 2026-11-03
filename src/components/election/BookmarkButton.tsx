'use client';

import { useEffect, useRef, useState } from 'react';
import { Bookmark, Check, Copy, Share2, X } from 'lucide-react';

type Device = 'ios' | 'android' | 'mac' | 'other';
const detect = (): Device => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Mac/.test(ua)) return 'mac';
  return 'other';
};

const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex min-w-9 items-center justify-center rounded-md border border-b-4 border-[#D1D5DB] bg-[#F9FAFB] px-2.5 py-1 text-sm font-bold text-[#0D1117]">{children}</kbd>
);

/** Browsers do not let a page add its own bookmark, so this opens a panel that shows exactly how to do it on the reader's device. */
export default function BookmarkButton({ url, title, dark = false }: { url: string; title: string; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Device>('other');
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const toggle = () => {
    if (!open) { setDevice(detect()); setCanShare(typeof navigator.share === 'function'); }
    setOpen(o => !o);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  const share = async () => { try { await navigator.share({ title, url }); } catch { /* cancelled */ } };

  return (
    <span ref={box} className="relative inline-block">
      <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="dialog"
        className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${dark ? 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20' : 'border border-[#E5E7EB] bg-white text-[#0D1117] hover:border-[#F97316]'}`}>
        <Bookmark size={16} aria-hidden /> Bookmark this page
      </button>

      {open && (
        <div role="dialog" aria-label="How to bookmark this page"
          className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-white p-4 text-left text-[#0D1117] shadow-2xl ring-1 ring-black/10">
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="font-bold">Bookmark this page</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#4A5568] hover:bg-[#F4F6FA]"><X size={16} /></button>
          </div>

          {device === 'ios' ? (
            <p className="text-sm leading-relaxed text-[#4A5568]">Tap the <strong>Share</strong> button in Safari, then choose <strong>Add Bookmark</strong> or <strong>Add to Home Screen</strong>.</p>
          ) : device === 'android' ? (
            <p className="text-sm leading-relaxed text-[#4A5568]">Tap the <strong>⋮ menu</strong> in your browser, then the <strong>star</strong> (Add bookmark) or <strong>Add to Home screen</strong>.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#4A5568]">
              <span>Press</span> <Key>{device === 'mac' ? '⌘' : 'Ctrl'}</Key> <span>+</span> <Key>D</Key> <span>on your keyboard, then click Done.</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 text-sm font-semibold hover:border-[#F97316]">
              {copied ? <Check size={15} className="text-green-600" aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? 'Link copied' : 'Copy link'}
            </button>
            {canShare && (
              <button type="button" onClick={share} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#F97316] px-3 text-sm font-semibold text-white hover:bg-[#EA580C]">
                <Share2 size={15} aria-hidden /> Share
              </button>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
