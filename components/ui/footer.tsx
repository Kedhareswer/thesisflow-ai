import React from 'react';
import { cn } from '@/lib/utils';

type FooterProps = React.ComponentProps<'footer'> & {
  children: React.ReactNode;
};

export function Footer({ className, ...props }: Omit<FooterProps, 'children'>) {
  return (
    <footer
      className={cn(
        'relative isolate overflow-visible border-t border-border bg-background text-foreground h-[100svh]',
        className,
      )}
      role="contentinfo"
      {...props}
    >

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-8 py-16 md:py-24 flex flex-col justify-center">
        {/* Top subtle rule (blazity-like) */}
        <div className="absolute left-1/2 top-6 h-[2px] w-[min(100vw,theme(maxWidth.7xl))] -translate-x-1/2 bg-border" />

        <div className="relative grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Intro / Tagline */}
          <div className="md:col-span-3 pr-2">
            <p className="text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.25em] text-black mb-3">
              Make your Research
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold leading-tight text-black">
              with minimal distractions
            </h2>
          </div>

          {/* Link columns */}
          <div className="md:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <LinksGroup
              className="first:pl-0 first:border-l-0 pl-6 lg:pl-8 border-l md:border-l-2 border-border"
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
              className="first:pl-0 first:border-l-0 pl-6 lg:pl-8 border-l md:border-l-2 border-border"
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
              className="first:pl-0 first:border-l-0 pl-6 lg:pl-8 border-l md:border-l-2 border-border"
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
              className="first:pl-0 first:border-l-0 pl-6 lg:pl-8 border-l md:border-l-2 border-border"
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
      </div>

      {/* Watermark wordmark (4/5 visible, 1/5 hidden) */}
      <div className="pointer-events-none select-none absolute inset-x-0 bottom-8 z-0 overflow-hidden">
        <div
          className="text-transparent uppercase tracking-tight leading-none whitespace-nowrap font-extrabold"
          style={{ 
            WebkitTextStroke: '1.25px rgba(255,107,44,0.28)',
            transform: 'translateX(-10%)', // Hide 1/5 (20%) by shifting left 10%
            width: '125%' // Make text 25% wider to ensure it spans full width when shifted
          }}
        >
          <span className="block leading-none text-[clamp(120px,20vw,300px)]">@thesisflow</span>
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
      <h3 className="text-black mt-2 mb-4 text-xs md:text-sm font-semibold tracking-[0.22em] uppercase">
        {title}
      </h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.title}>
            <a
              href={link.href}
              className="text-black hover:text-black hover:underline underline-offset-4 decoration-border/60 text-[15px] md:text-[17px] font-medium"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

