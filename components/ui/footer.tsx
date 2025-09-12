import React from 'react';
import { cn } from '@/lib/utils';
// Background component removed per request

type FooterProps = React.ComponentProps<'footer'> & {
  children: React.ReactNode;
};

export function Footer({ className, ...props }: Omit<FooterProps, 'children'>) {
  return (
    <footer
      className={cn(
        'relative isolate overflow-visible border-t bg-transparent text-neutral-100 min-h-[100dvh]',
        className,
      )}
      {...props}
    >

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-8 py-16 md:py-24 flex flex-col justify-center">
        {/* Top subtle rule (blazity-like) */}
        <div className="absolute left-1/2 top-6 h-[2px] w-[min(100vw,theme(maxWidth.7xl))] -translate-x-1/2 bg-white/20" />

        <div className="relative grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Intro / Tagline */}
          <div className="md:col-span-3 pr-2">
            <p className="text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.25em] text-white/85 mb-3">
              We turn big ideas into
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight text-white">
              world‑class research products
            </h2>
          </div>

          {/* Link columns */}
          <div className="md:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <LinksGroup
              className="first:pl-0 first:border-l-0 pl-6 lg:pl-8 border-l md:border-l-2 border-white/25"
              title="Platform"
              links={[
                { title: 'Research Explorer', href: '/explorer' },
                { title: 'Smart Summarizer', href: '/summarizer' },
                { title: 'Project Planner', href: '/planner' },
                { title: 'Collaboration Hub', href: '/collaborate' },
                { title: 'AI Research Assistant', href: '/research-assistant' },
              ]}
            />
            <LinksGroup
              className="first:pl-0 first:border-l-0 pl-6 lg:pl-8 border-l md:border-l-2 border-white/25"
              title="Resources"
              links={[
                { title: 'Pricing', href: '#pricing' },
                { title: 'FAQs', href: '#faq' },
                { title: 'Docs', href: '/docs' },
                { title: 'Guides', href: '/docs/guides' },
                { title: 'Blog', href: '/blog' },
              ]}
            />
            <LinksGroup
              className="first:pl-0 first:border-l-0 pl-6 lg:pl-8 border-l md:border-l-2 border-white/25"
              title="Community"
              links={[
                { title: 'Forum', href: '/community' },
                { title: 'Events', href: '/events' },
                { title: 'Partners', href: '/partners' },
                { title: 'Affiliates', href: '/affiliates' },
                { title: 'Careers', href: '/careers' },
              ]}
            />
            <LinksGroup
              className="first:pl-0 first:border-l-0 pl-6 lg:pl-8 border-l md:border-l-2 border-white/25"
              title="Legal"
              links={[
                { title: 'Terms', href: '/terms' },
                { title: 'Privacy', href: '/privacy' },
                { title: 'Security', href: '/.well-known/security.txt' },
                { title: 'Cookie Policy', href: '/privacy#cookies' },
                { title: 'Legal', href: '/legal' },
              ]}
            />
          </div>
        </div>

        {/* Bottom rule + copyright */}
        <div className="relative mt-16 border-t-2 border-white/20 pt-6 flex items-center justify-between">
          <p className="text-[12px] md:text-[13px] tracking-wider font-bold text-white/80">
            © {new Date().getFullYear()} ThesisFlow‑AI. ALL RIGHTS RESERVED
          </p>
        </div>
      </div>

      {/* Watermark wordmark (ensure fully visible, centered, and responsive) */}
      <div className="pointer-events-none select-none absolute inset-x-0 bottom-6 z-0 flex justify-center px-6">
        <div
          className="text-transparent uppercase tracking-tight leading-none text-center whitespace-nowrap font-extrabold"
          style={{ WebkitTextStroke: '1.25px rgba(255,107,44,0.28)' }}
        >
          <span className="block leading-none text-[clamp(56px,10vw,160px)]">thesisflow</span>
        </div>
      </div>
    </footer>
  );
}

interface LinksGroupProps {
  title: string;
  links: { title: string; href: string }[];
  className?: string;
}
function LinksGroup({ title, links, className }: LinksGroupProps) {
  return (
    <div className={cn('p-2', className)}>
      <h3 className="text-foreground/80 mt-2 mb-4 text-[11px] md:text-xs font-semibold tracking-[0.2em] uppercase">
        {title}
      </h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.title}>
            <a
              href={link.href}
              className="text-white/85 hover:text-white text-[13px] md:text-[15px] font-medium"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

