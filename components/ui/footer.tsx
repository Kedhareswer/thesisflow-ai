import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import BackgroundNoise from '@/components/ui/background-snippets-noise-effect11';

type FooterProps = React.ComponentProps<'footer'> & {
  children: React.ReactNode;
};

export function Footer({ className, ...props }: Omit<FooterProps, 'children'>) {
  return (
    <footer
      className={cn(
        'relative overflow-hidden border-t bg-transparent text-neutral-100',
        className,
      )}
      {...props}
    >
      {/* Scoped background (radial + grain) under the footer only */}
      <BackgroundNoise scoped />

      <div className="relative mx-auto max-w-5xl px-4 font-mono">
        <div className="relative grid grid-cols-1 border-x md:grid-cols-4 md:divide-x">
          {/* Column 1: Platform */}
          <div>
            <SocialCard title="Get Started" href="/signup" />
            <LinksGroup
              title="Platform"
              links={[
                { title: 'Research Explorer', href: '/explorer' },
                { title: 'Smart Summarizer', href: '/summarizer' },
                { title: 'Project Planner', href: '/planner' },
                { title: 'Collaboration Hub', href: '/collaborate' },
                { title: 'AI Research Assistant', href: '/research-assistant' },
              ]}
            />
          </div>

          {/* Column 2: Resources */}
          <div>
            <SocialCard title="Changelog" href="/changelog" />
            <LinksGroup
              title="Resources"
              links={[
                { title: 'Pricing', href: '#pricing' },
                { title: 'FAQs', href: '#faq' },
                { title: 'Docs', href: '/docs' },
                { title: 'Guides', href: '/docs/guides' },
                { title: 'Blog', href: '/blog' },
              ]}
            />
          </div>

          {/* Column 3: Community */}
          <div>
            <SocialCard title="Community" href="/community" />
            <LinksGroup
              title="Community"
              links={[
                { title: 'Forum', href: '/community' },
                { title: 'Events', href: '/events' },
                { title: 'Partners', href: '/partners' },
                { title: 'Affiliates', href: '/affiliates' },
                { title: 'Careers', href: '/careers' },
              ]}
            />
          </div>

          {/* Column 4: Company & Legal */}
          <div>
            <SocialCard title="Contact" href="/contact" />
            <LinksGroup
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
      <div className="relative flex justify-center border-t p-3">
        <p className="text-neutral-400 text-xs">
          © {new Date().getFullYear()} ThesisFlow-AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

interface LinksGroupProps {
  title: string;
  links: { title: string; href: string }[];
}
function LinksGroup({ title, links }: LinksGroupProps) {
  return (
    <div className="p-2">
      <h3 className="text-foreground/75 mt-2 mb-4 text-xs font-medium tracking-wider uppercase font-mono">
        {title}
      </h3>
      <ul>
        {links.map((link) => (
          <li key={link.title}>
            <a
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-xs font-mono"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialCard({ title, href }: { title: string; href: string }) {
  return (
    <a
      href={href}
      className="hover:bg-accent hover:text-accent-foreground flex items-center justify-between border-t border-b p-2 text-sm md:border-t-0 font-mono"
    >
      <span className="font-medium">{title}</span>
      <ArrowRight className="h-4 w-4 transition-colors" />
    </a>
  );
}
