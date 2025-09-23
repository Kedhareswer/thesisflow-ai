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
              <div className="hero-reveal__parallax">
                {/* Parallax AI Images */}
                <div className="parallax-image parallax-image-1">
                  <Image
                    src="/assistant.png"
                    alt="AI Assistant"
                    width={120}
                    height={120}
                    className="floating-image"
                    priority={false}
                  />
                </div>
                <div className="parallax-image parallax-image-2">
                  <Image
                    src="/ai.png"
                    alt="AI Technology"
                    width={100}
                    height={100}
                    className="floating-image"
                    priority={false}
                  />
                </div>
              </div>
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
            background-color: #FF6B2C;
            color:rgb(224, 218, 218);
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
            width: 100%;
            height: 100%;
            pointer-events: none;
          }

          .parallax-image {
            position: absolute;
            opacity: 0.7;
            filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
          }

          .parallax-image-1 {
            top: 20%;
            left: -10%;
            animation: float1 6s ease-in-out infinite;
          }

          .parallax-image-2 {
            top: 60%;
            right: -5%;
            animation: float2 8s ease-in-out infinite;
          }

          .floating-image {
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 8px;
          }

          @keyframes float1 {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(2deg); }
          }

          @keyframes float2 {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(-2deg); }
          }

          @media (max-width: 768px) {
            .hero-reveal__header {
              font-size: clamp(2rem, 8vw, 8rem);
              line-height: clamp(2.5rem, 10vw, 10rem);
            }
            
            .parallax-image-1 {
              top: 15%;
              left: -15%;
              transform: scale(0.8);
            }
            
            .parallax-image-2 {
              top: 70%;
              right: -10%;
              transform: scale(0.7);
            }
            
            .floating-image {
              padding: 4px;
            }
          }
        `}</style>
      </section>

      {/* Research Stacking Cards Section */}
      <ResearchStackingDemo />
    </>
  )
}
