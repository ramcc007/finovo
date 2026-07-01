import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight, ArrowUpRight, Mail, ExternalLink,
  LineChart, Wallet, Sparkles, Layers, CheckCircle2,
} from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

export const metadata: Metadata = {
  title: 'Portfolio — Projects by RCC',
  description: 'A showcase of products built by RCC, including Finovo (free Indian stock screener) and Clearfolio.',
  robots: { index: true, follow: true },
};

const CONTACT_EMAIL = 'onlinemoneyrcc@gmail.com';

interface Project {
  name: string;
  domain: string;
  tagline: string;
  summary: string;
  objective: string;
  stack: string[];
  highlights: string[];
  url: string;
  status: 'Live' | 'In progress';
  accentFrom: string;
  accentTo: string;
  icon: typeof LineChart;
}

const PROJECTS: Project[] = [
  {
    name: 'Finovo',
    domain: 'finovo-rcc.vercel.app',
    tagline: 'Free Indian stock screener & research platform',
    summary:
      'A free research and screening platform covering 5,000+ NSE & BSE listed companies, with a decade of fundamentals, financial ratios, and clean financial statements — no login, no paywall.',
    objective:
      'Built to give retail investors in India professional-grade fundamental research tools, without the logins, paywalls, and premium tiers that gate most screening platforms.',
    stack: ['Next.js', 'TypeScript', 'React', 'Tailwind CSS', 'Supabase / PostgreSQL'],
    highlights: [
      '5,000+ NSE & BSE companies',
      '47+ financial ratios & metrics',
      '10 years of historical fundamentals',
      'Custom screener with live filters',
    ],
    url: 'https://finovo-rcc.vercel.app/',
    status: 'Live',
    accentFrom: '#F97316',
    accentTo: '#FB923C',
    icon: LineChart,
  },
  {
    name: 'Clearfolio',
    domain: 'clearfolio.online',
    tagline: 'Clear, no-clutter portfolio tracking',
    summary:
      'A clean portfolio tracker for investors to consolidate their holdings and see exactly how they are performing — built as a focused, jargon-free companion to stock research tools.',
    objective:
      'Built to close the loop after research: once you have picked your stocks, Clearfolio gives you a simple, clear view of how your actual portfolio is doing.',
    stack: ['Next.js', 'TypeScript', 'Tailwind CSS'],
    highlights: [
      'Consolidated portfolio view',
      'Clean, distraction-free UI',
      'Built to pair with stock research workflows',
    ],
    url: 'https://clearfolio.online/',
    status: 'Live',
    accentFrom: '#15A05B',
    accentTo: '#34D399',
    icon: Wallet,
  },
];

function BrowserPreview({ project }: { project: Project }) {
  const Icon = project.icon;
  return (
    <div className="relative rounded-xl overflow-hidden border border-[#E9EDF4] bg-white">
      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#F4F6FA] border-b border-[#E9EDF4]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#E2E8F0]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#E2E8F0]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#E2E8F0]" />
        <span className="ml-2 flex-1 text-[11px] text-[#8A94A4] bg-white border border-[#E6EAF1] rounded-md px-2.5 py-1 truncate font-mono">
          {project.domain}
        </span>
      </div>
      <div
        className="relative h-44 md:h-52 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${project.accentFrom}1A, ${project.accentTo}0D)` }}
      >
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(#0D1117 1px, transparent 1px), linear-gradient(90deg, #0D1117 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: `linear-gradient(135deg, ${project.accentFrom}, ${project.accentTo})` }}
        >
          <Icon size={28} className="text-white" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <div className="bg-[#FAFBFD] min-h-screen">
      {/* ───────────────── NAV ───────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E9EDF4] h-16 flex items-center px-4 md:px-6">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <Link href="/portfolio" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0D1117] rounded-[9px] flex items-center justify-center">
              <Sparkles size={15} className="text-[#F97316]" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[#131A24] text-[16px] tracking-tight">RCC · Portfolio</span>
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#0D1117] hover:bg-[#1C2533] px-4 py-2 rounded-lg transition-colors"
          >
            <Mail size={14} /> Get in touch
          </a>
        </div>
      </header>

      {/* ───────────────── HERO ───────────────── */}
      <section className="hero-light">
        <div className="hero-grid-light" />
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-16 md:pb-20">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E6EAF1] bg-white px-3 py-1.5 mb-7 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15A05B]" />
              <span className="eyebrow text-[#56616F]">Available for new opportunities</span>
            </div>
            <h1 className="h-display text-[#131A24] mb-5 max-w-3xl">
              I build products end-to-end —{' '}
              <span className="text-[#F97316]">from idea to production.</span>
            </h1>
            <p className="text-[#56616F] text-base md:text-lg leading-relaxed max-w-2xl mb-9">
              A look at what I&apos;ve shipped: full-stack web apps built solo, end to end —
              product thinking, design, frontend, backend, and deployment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="#projects" className="btn btn-primary">
                View projects <ArrowRight size={16} />
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-secondary">
                <Mail size={15} /> Contact me
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────── PROJECTS ───────────────── */}
      <section id="projects" className="max-w-5xl mx-auto px-4 md:px-6 py-14 md:py-20 scroll-mt-16">
        <Reveal>
          <div className="mb-10">
            <h2 className="h-section text-[#0D1117]">Projects</h2>
            <p className="text-sm text-[#4A5568] mt-1.5">Live products, built and shipped. More on the way.</p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {PROJECTS.map((project, i) => (
            <Reveal key={project.name} delay={i * 80}>
              <div className="card-plain lift p-5 h-full flex flex-col">
                <BrowserPreview project={project} />

                <div className="flex items-start justify-between mt-5 mb-1.5">
                  <h3 className="font-bold text-[#0D1117] text-lg">{project.name}</h3>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#15A05B] bg-[#E4F7EC] px-2 py-0.5 rounded-full shrink-0 ml-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#15A05B]" /> {project.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#56616F] mb-3">{project.tagline}</p>

                <p className="text-sm text-[#4A5568] leading-relaxed mb-4">{project.summary}</p>

                <div className="mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8A94A4] mb-2">Objective</div>
                  <p className="text-sm text-[#4A5568] leading-relaxed">{project.objective}</p>
                </div>

                <div className="mb-4 space-y-1.5">
                  {project.highlights.map(h => (
                    <div key={h} className="flex items-start gap-2 text-sm text-[#4A5568]">
                      <CheckCircle2 size={15} className="text-[#15A05B] shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {project.stack.map(s => (
                    <span key={s} className="text-[11px] font-medium text-[#56616F] bg-[#F2F4F9] px-2.5 py-1 rounded-md">
                      {s}
                    </span>
                  ))}
                </div>

                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#0D1117] hover:bg-[#1C2533] px-4 py-2.5 rounded-lg transition-colors"
                >
                  View live <ArrowUpRight size={15} />
                </a>
              </div>
            </Reveal>
          ))}

          {/* Coming soon placeholder */}
          <Reveal delay={PROJECTS.length * 80}>
            <div className="rounded-2xl border border-dashed border-[#D3DAE5] p-5 h-full flex flex-col items-center justify-center text-center min-h-[280px] lg:min-h-0">
              <div className="w-11 h-11 rounded-xl bg-[#F2F4F9] flex items-center justify-center mb-4">
                <Layers size={20} className="text-[#8A94A4]" />
              </div>
              <h3 className="font-semibold text-[#0D1117] text-sm mb-1.5">More projects coming soon</h3>
              <p className="text-sm text-[#8A94A4] max-w-xs">
                This space gets a new card every time something ships.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────── CTA / CONTACT ───────────────── */}
      <section className="px-4 md:px-6 pb-16 md:pb-24">
        <Reveal>
          <div className="hero-dark max-w-5xl mx-auto rounded-2xl px-6 md:px-12 py-12 md:py-16 text-center relative">
            <div className="hero-grid" />
            <div className="relative">
              <h2 className="h-section text-white mb-3">Let&apos;s work together</h2>
              <p className="text-white/55 text-base max-w-lg mx-auto mb-8">
                Open to full-time roles and freelance projects. Reach out — happy to walk through
                how any of these were built.
              </p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-primary">
                <Mail size={16} /> {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ───────────────── FOOTER ───────────────── */}
      <footer className="border-t border-[#E9EDF4] py-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#8A94A4]">© {new Date().getFullYear()} RCC. Built with Next.js & Tailwind CSS.</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-xs text-[#8A94A4] hover:text-[#F97316] inline-flex items-center gap-1 transition-colors">
            <ExternalLink size={12} /> {CONTACT_EMAIL}
          </a>
        </div>
      </footer>
    </div>
  );
}
