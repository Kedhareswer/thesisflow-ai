import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type FooterProps = React.ComponentProps<'footer'> & {
  children?: React.ReactNode;
};

export function Footer({ className, ...props }: FooterProps) {
  return (
    <footer
      className={cn(
        'relative isolate overflow-hidden',
        className,
      )}
      role="contentinfo"
      {...props}
    >
      {/* Main hero section with pool/laptop image */}
      <section className="relative min-h-[100vh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/research.png"
            alt="Take control of your research without the stress"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        </div>
        
        <div className="relative z-10 h-full min-h-[100vh] flex items-center">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6">
                Take Control of<br />
                Your Research<br />
                Without the<br />
                Stress.
              </h2>
              <p className="text-lg text-white/90 mb-8 max-w-md leading-relaxed">
                Get on the list, no spam, no pressure. Just smarter research, coming soon.
              </p>
              <Button 
                className="bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 text-white px-8 py-4 text-lg font-semibold rounded-sm"
              >
                Join Waitlist
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom section with social links and infinite scroll */}
      <section className="relative bg-black text-white py-8">
        {/* Social links */}
        <div className="container mx-auto px-6 lg:px-8 flex items-center justify-between mb-8">
          <div className="flex items-center space-x-6">
            <a 
              href="https://twitter.com/thesisflow" 
              className="text-white hover:text-white/80 transition-colors"
              aria-label="Twitter"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a 
              href="https://facebook.com/thesisflow" 
              className="text-white hover:text-white/80 transition-colors"
              aria-label="Facebook"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a 
              href="https://linkedin.com/company/thesisflow" 
              className="text-white hover:text-white/80 transition-colors"
              aria-label="LinkedIn"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a 
              href="https://instagram.com/thesisflow" 
              className="text-white hover:text-white/80 transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C3.182 14.498 2.29 12.892 2.29 11.987c0-2.981 1.297-5.367 3.836-6.620C7.423 4.618 9.746 4.618 12.017 4.618s4.594 0 5.891 1.749c2.539 1.253 3.836 3.639 3.836 6.62 0 .905-.892 2.511-2.846 3.704-.875.807-2.026 1.297-3.323 1.297H8.449z"/>
              </svg>
            </a>
          </div>
          
          <div className="flex items-center">
            <Button 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-black transition-colors"
            >
              Join Waitlist
            </Button>
          </div>
        </div>

        {/* Infinite scrolling text */}
        <div className="relative overflow-hidden">
          <div className="animate-scroll-infinite whitespace-nowrap text-[clamp(80px,15vw,200px)] font-bold uppercase tracking-tight leading-none text-transparent select-none pointer-events-none"
               style={{ 
                 WebkitTextStroke: '2px rgba(255,255,255,0.1)'
               }}>
            ThesisFlow ThesisFlow ThesisFlow ThesisFlow ThesisFlow ThesisFlow ThesisFlow ThesisFlow ThesisFlow ThesisFlow
          </div>
        </div>

        {/* Copyright */}
        <div className="container mx-auto px-6 lg:px-8 pt-8">
          <div className="flex items-center justify-between text-sm text-white/60">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span className="font-semibold">ThesisFlow</span>
            </div>
            <div>
              Copyright © 2025 ThesisFlow. All Rights Reserved
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
}


