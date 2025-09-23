"use client"

import React, { useEffect, useRef } from "react"

// Split clip-path GSAP ScrollTrigger animation that pins and scrubs with scroll
// Based on hero-reveal pattern with proper HTML structure and clip-path animations
// Usage: <AnimatedTextReveal text="RESEARCH" />

export function AnimatedTextReveal({
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
    }

    void setupAnimation()

    // Cleanup function
    return () => {
      const { ScrollTrigger } = require("gsap/ScrollTrigger")
      ScrollTrigger.getAll().forEach((trigger: any) => trigger.kill())
    }
  }, [])

  return (
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
            <div className="hero-reveal__parallax">
              {/* Parallax elements can be added here */}
            </div>
            <div className="hero-reveal__content-p">
              {/* Content can be added here */}
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
          background-color: #ffffff;
          color: #000000;
          display: flex;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: clamp(3.125rem, 12.61vw + -0.138rem, 15.625rem);
          line-height: clamp(4.688rem, 15.763vw + 0.609rem, 20.313rem);
          font-weight: 900;
          justify-content: center;
          left: 0;
          min-height: 100vh;
          position: relative;
          top: 0;
          will-change: transform;
          z-index: 1;
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
          position: absolute;
          z-index: 0;
        }

        @media (max-width: 768px) {
          .hero-reveal__header {
            font-size: clamp(2rem, 8vw, 8rem);
            line-height: clamp(2.5rem, 10vw, 10rem);
          }
        }
      `}</style>
    </section>
  )
}
