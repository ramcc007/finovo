import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-[#0B0E14] text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Logo className="w-7 h-7 rounded-[6px] shrink-0" />
              <span className="font-bold text-white text-[17px] tracking-tight">Scripwise</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Free stock research and screening platform for Indian equity markets. NSE &amp; BSE data.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Tools</h4>
            <ul className="space-y-2.5">
              {[
                { href: '/screener', label: 'Stock Explorer' },
                { href: '/markets', label: 'Market Overview' },
                { href: '/screens', label: 'Pre-built Screens' },
                { href: '/pricing', label: 'Pricing' },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/60 hover:text-[#F97316] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { href: '/disclaimer', label: 'Disclaimer' },
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/terms', label: 'Terms of Use' },
                { href: '/refund', label: 'Refund & Cancellation' },
                { href: '/contact', label: 'Contact Us' },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/60 hover:text-[#F97316] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Scripwise. Data for informational purposes only. Not investment advice.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.producthunt.com/products/scripwise?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-scripwise"
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external Product Hunt badge SVG, not a local/optimizable asset */}
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1193506&theme=light"
                alt="Scripwise - Free stock screener for Indian equities, transparent scoring | Product Hunt"
                width={250}
                height={54}
              />
            </a>
            <p className="text-xs text-white/30">
              Created by <span className="text-[#F97316] font-semibold">RCC</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
