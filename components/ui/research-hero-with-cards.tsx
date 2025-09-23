'use client';

import React, { useEffect, useRef } from "react"
import Image from "next/image"
import { ResearchStackingDemo } from "@/components/ui/research-stacking-demo"

// Combined component that shows the RESEARCH text reveal followed by stacking cards
// Usage: <ResearchHeroWithCards />

export function ResearchHeroWithCards({
  text = "RESEARCH",
  className = "",
}: {
  text?: string
  className?: string
}) {
  const heroRevealRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const setupAnimation = async () => {
      // Dynamically import GSAP and ScrollTrigger to avoid SSR issues
      const { gsap } = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")
      
      if (typeof window !== "undefined") {
        gsap.registerPlugin(ScrollTrigger)
      }

      if (!heroRevealRef.current) return

      const element = heroRevealRef.current
      const heroBox = element.querySelector('.hero-reveal__header') as HTMLElement
      const heroHeadings = element.querySelectorAll('.hero-reveal_split_item')
      const contentEl = element.querySelector('.hero-reveal__content') as HTMLElement

      if (!heroBox || !contentEl || heroHeadings.length < 2) return

      const heroBoxHeight = heroBox.offsetHeight
      const contentHeight = contentEl.offsetHeight

      // Content scroll up animation
      gsap
        .timeline({
          scrollTrigger: {
            trigger: element,
            start: 'top top',
            end: `+=${heroBoxHeight > contentHeight ? heroBoxHeight : contentHeight}`,
            scrub: true
          }
        })
        .fromTo(contentEl, { y: '50%' }, { y: '0%', ease: 'none' }, 0.2)

      // Main timeline with pin and scrub
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: element,
          start: 'top top',
          end: `+=${heroBoxHeight > contentHeight ? heroBoxHeight : contentHeight}`,
          scrub: true,
          pin: true
        }
      })

      // Main clipPath animation
      tl.fromTo(
        heroBox,
        {
          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%, 0 50%, 100% 50%, 100% 100%, 0 100%)'
        },
        {
          clipPath: 'polygon(0 0, 100% 0, 100% 0%, 0 0%, 0 100%, 100% 100%, 100% 100%, 0 100%)',
          duration: 0.4,
          ease: 'power4.inOut'
        }
      )

      // Split animations for child items
      tl.fromTo(
        heroHeadings[0],
        { y: '0%' },
        { y: '-30%', ease: 'power3.inOut' },
        0
      )

      tl.fromTo(
        heroHeadings[1],
        { y: '0%' },
        { y: '30%', ease: 'power3.inOut' },
        0
      )

      // Parallax scroll animations for images (Alice in Wonderland style)
      const parallaxScrollBySpeed = (selector: string, speed: number = 1) => {
        const el = element.querySelector(selector) as HTMLElement
        if (!el) return

        gsap.to(el, {
          yPercent: (speed - 1) * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: element,
            start: 'top top',
            end: `+=${contentHeight * 3}`,
            scrub: true
          }
        })
      }

      // Apply different scroll speeds to create parallax effect
      parallaxScrollBySpeed('.hero-reveal__parallax-assistant', 8)
      parallaxScrollBySpeed('.hero-reveal__parallax-ai', 12)
    }

    void setupAnimation()

    // Cleanup function
    return () => {
      const { ScrollTrigger } = require("gsap/ScrollTrigger")
      ScrollTrigger.getAll().forEach((trigger: any) => trigger.kill())
    }
  }, [])

  return (
    <>
      {/* RESEARCH Text Reveal Section */}
      <section
        ref={heroRevealRef as any}
        className={`hero-reveal ${className}`}
        style={{
          backgroundColor: '#000000',
          position: 'relative',
          minHeight: '100vh'
        }}
      >
        <article>
          <header className="hero-reveal__header">
            <div className="hero-reveal_split">
              <div className="hero-reveal_split_item">
                <p className="c-wide-text -split">{text}</p>
              </div>
              <div className="hero-reveal_split_item" aria-hidden="true">
                <p className="c-wide-text -split" aria-hidden="true">{text}</p>
              </div>
            </div>
          </header>

          <div className="hero-reveal__content">
            <div className="hero-reveal__content-inner">
              <div className="hero-reveal__parallax"></div>
              <div className="hero-reveal__content-p">
                {/* This space is for the transition to stacking cards */}
              </div>
            </div>
          </div>
        </article>

        <style jsx>{`
          .hero-reveal {
            background-color: #000000;
            position: relative;
            min-height: 100vh !important;
          }

          .hero-reveal__header {
            align-items: center;
            background: transparent url('/background.png') center/cover no-repeat;
            color:rgb(224, 218, 218);
            display: flex;
            font-family: 'IBM Plex Sans', sans-serif;
            font-size: clamp(2rem, 8vw, 15.625rem);
            line-height: clamp(2.5rem, 10vw, 20.313rem);
            font-weight: 900;
            justify-content: center;
            left: 0;
            min-height: 100vh;
            position: relative;
            top: 0;
            will-change: transform;
            z-index: 1;
            padding: 0 1rem;
          }

          .hero-reveal_split {
            align-items: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            position: relative;
            width: 100%;
          }

          .hero-reveal_split_item {
            align-items: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 100vh;
            width: 100%;
          }

          .hero-reveal_split_item:nth-child(1) {
            -webkit-clip-path: inset(0 0 calc(50% - 1px) 0);
            clip-path: inset(0 0 calc(50% - 1px) 0);
          }

          .hero-reveal_split_item:nth-child(2) {
            -webkit-clip-path: inset(calc(50% - 1px) 0 0 0);
            clip-path: inset(calc(50% - 1px) 0 0 0);
            left: 0;
            position: absolute;
            top: 0;
          }

          .c-wide-text {
            margin: 0;
            font-family: 'IBM Plex Sans', sans-serif;
          }

          .hero-reveal__content {
            color: #ffffff;
            display: flex;
            justify-content: center;
            padding: 0;
            position: relative;
            margin-top: -60vh;
          }

          .hero-reveal__content-inner {
            max-width: 31.25rem;
            position: relative;
            padding: 0 1rem;
          }

          .hero-reveal__content-p {
            padding-bottom: 8rem;
          }

          .hero-reveal__parallax {
            display: none; /* disabled here to avoid duplication; parallax images are rendered in ResearchStackingCards header */
            position: absolute;
            z-index: 0;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 100vw;
            height: 120vh;
            pointer-events: none;
          }

          /* parallax assistant/ai styles removed here */

          @media (max-width: 768px) {
            .hero-reveal__header {
              font-size: clamp(1.5rem, 6vw, 6rem);
              line-height: clamp(2rem, 8vw, 8rem);
              padding: 0 0.5rem;
            }
            
            .hero-reveal__content {
              margin-top: -40vh;
              padding: 0 1rem;
            }
            
            .hero-reveal__content-inner {
              max-width: 100%;
              padding: 0 0.5rem;
            }
            
            .hero-reveal__parallax-assistant {
              left: -160px;
              top: -180px;
              transform: scale(0.8);
            }
            
            .hero-reveal__parallax-ai {
              left: 180px;
              top: -140px;
              transform: scale(0.75);
            }
          }
          
          @media (max-width: 480px) {
            .hero-reveal__header {
              font-size: clamp(1.2rem, 5vw, 4rem);
              line-height: clamp(1.5rem, 6vw, 5rem);
              padding: 0 0.25rem;
            }
            
            .hero-reveal__content {
              margin-top: -30vh;
            }
          }
        `}</style>
      </section>

      {/* Research Stacking Cards Section */}
      <ResearchStackingDemo />
    </>
  )
}
