'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type FooterProps = React.ComponentProps<'footer'> & {
  children?: React.ReactNode;
};

export function Footer({ className, ...props }: FooterProps) {
  const scrollingTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically import GSAP to avoid SSR issues
    const loadGSAP = async () => {
      try {
        const { gsap } = await import('gsap');
        
        if (scrollingTextRef.current) {
          const text = scrollingTextRef.current;
          
          // Set up the text content and styles
          text.innerHTML = "THESISFLOW-AI ".repeat(20);
          text.style.whiteSpace = "nowrap";
          text.style.display = "inline-block";
          
          // GSAP animation - slower and smoother (increase duration to slow speed)
          gsap.to(text, {
            xPercent: -100,
            repeat: -1,
            duration: 160,
            ease: "none",
            modifiers: {
              xPercent: gsap.utils.unitize((x: string) => parseFloat(x) % 100)
            }
          });
        }
      } catch (error) {
        console.warn('GSAP not available, using CSS fallback');
        // Fallback to CSS animation
        if (scrollingTextRef.current) {
          const text = scrollingTextRef.current;
          text.innerHTML = "THESISFLOW-AI ".repeat(20);
          text.style.whiteSpace = "nowrap";
          text.style.display = "inline-block";
          text.classList.add("gsap-scroll-infinite");
        }
      }
    };

    loadGSAP();
  }, []);

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
            src="/footer.png"
            alt="research without stress"
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
                Research<br />
                Without<br />
                Stress.
              </h2>
              <p className="text-lg text-white/90 mb-8 max-w-md leading-relaxed">
                Get on the list, no spam, no pressure. Just smarter research, coming soon.
              </p>
              <Button 
                className="bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 text-white px-6 py-3 text-sm font-medium rounded-sm shadow-lg"
              >
                Join Waitlist
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom section with infinite scroll and overlaid elements */}
      <section className="relative bg-black text-white min-h-[50vh] flex flex-col">
        {/* Social links and Join Waitlist button at the top */}
        <div className="relative z-10 pt-8">
          <div className="container mx-auto px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <a 
                href="https://twitter.com/thesisflow-ai" 
                className="text-white hover:text-[#FF6B2C] transition-colors duration-200"
                aria-label="Twitter"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a 
                href="https://facebook.com/thesisflow-ai" 
                className="text-white hover:text-[#FF6B2C] transition-colors duration-200"
                aria-label="Facebook"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a 
                href="https://linkedin.com/company/thesisflow-ai" 
                className="text-white hover:text-[#FF6B2C] transition-colors duration-200"
                aria-label="LinkedIn"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
            
            <div className="flex items-center">
              <Button 
                className="bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 text-white border-2 border-[#FF6B2C] hover:border-[#FF6B2C]/90 px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Join Waitlist
              </Button>
            </div>
          </div>
        </div>

        {/* GSAP Infinite scrolling text - takes up most of the space */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
          <div 
            ref={scrollingTextRef}
            className="scrolling-text font-black uppercase tracking-tighter leading-none text-transparent select-none pointer-events-none"
            style={{ 
              WebkitTextStroke: '2px rgba(255,107,44,0.2)',
              fontFamily: 'IBM Plex Sans, sans-serif',
              color: 'transparent',
              fontSize: 'clamp(8rem, 15vw, 20rem)',
              fontWeight: '900'
            }}
          />
        </div>

        {/* Copyright and logo at the bottom */}
        <div className="relative z-10 pb-6">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between text-sm text-white/70">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-[#FF6B2C]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span className="font-semibold text-white">ThesisFlow-AI</span>
              </div>
              <div className="font-medium">
                Copyright © 2025 ThesisFlow-AI. All Rights Reserved
              </div>
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
}


