"use client"

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

interface AnimatedTextRevealProps {
  text: string
  className?: string
}

export function AnimatedTextReveal({ text, className = "" }: AnimatedTextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const topTextRef = useRef<HTMLDivElement>(null)
  const bottomTextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !topTextRef.current || !bottomTextRef.current) return

    const container = containerRef.current
    const topText = topTextRef.current
    const bottomText = bottomTextRef.current

    // Create timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top center",
        end: "bottom center",
        scrub: true,
        pin: true,
        pinSpacing: true,
      }
    })

    // Initial state - both texts fully visible
    gsap.set([topText, bottomText], {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
    })

    // Animation - split reveal effect
    tl.to(topText, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%)",
      y: -50,
      ease: "power4.inOut",
      duration: 1
    })
    .to(bottomText, {
      clipPath: "polygon(0% 50%, 100% 50%, 100% 100%, 0% 100%)",
      y: 50,
      ease: "power4.inOut",
      duration: 1
    }, 0) // Start at the same time as topText

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [])

  return (
    <section 
      ref={containerRef}
      className={`relative min-h-screen flex items-center justify-center bg-neutral-950 text-white overflow-hidden ${className}`}
    >
      {/* Background gradient */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_50%,rgba(255,107,44,0.15),transparent)]" />
      
      {/* Container for both text elements */}
      <div className="relative z-10 text-center">
        {/* Top half text */}
        <div
          ref={topTextRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
          }}
        >
          <h2 className="text-8xl md:text-9xl lg:text-[12rem] font-bold tracking-tight leading-none select-none">
            {text}
          </h2>
        </div>
        
        {/* Bottom half text */}
        <div
          ref={bottomTextRef}
          className="flex items-center justify-center"
          style={{
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
          }}
        >
          <h2 className="text-8xl md:text-9xl lg:text-[12rem] font-bold tracking-tight leading-none select-none">
            {text}
          </h2>
        </div>
      </div>
    </section>
  )
}
