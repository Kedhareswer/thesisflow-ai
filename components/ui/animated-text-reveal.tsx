"use client"

import React, { useLayoutEffect, useRef } from "react"

// Split clip-path GSAP ScrollTrigger animation that pins and scrubs with scroll
// Renders two identical text layers (top/bottom) and animates their clip-paths
// and opposite Y translations to create a split reveal effect on scroll.
// Usage: <AnimatedTextReveal text="RESEARCH" />

export function AnimatedTextReveal({
  text = "RESEARCH",
  className = "",
}: {
  text?: string
  className?: string
}) {
  const containerRef = useRef<HTMLElement | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    let ctx: any | null = null
    let killed = false

    const setup = async () => {
      // Dynamically import GSAP and ScrollTrigger to avoid SSR issues
      const gsapModule = await import("gsap")
      const ScrollTriggerModule = await import("gsap/dist/ScrollTrigger")
      const gsap: any = (gsapModule as any).gsap || (gsapModule as any).default || gsapModule
      const ScrollTrigger: any = (ScrollTriggerModule as any).ScrollTrigger || (ScrollTriggerModule as any).default
      gsap.registerPlugin(ScrollTrigger)

      if (!containerRef.current || !topRef.current || !bottomRef.current || killed) return

      const container = containerRef.current
      const top = topRef.current
      const bottom = bottomRef.current

      ctx = gsap.context(() => {
        // Initial state: fully visible (no split)
        gsap.set([top, bottom], {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          y: 0,
          willChange: "clip-path, transform",
        })

        // Timeline with ScrollTrigger pin + scrub
        const tl = gsap.timeline({
          defaults: { ease: "power4.inOut" },
          scrollTrigger: {
            trigger: container,
            start: "top top",
            end: "+=120%",
            scrub: true,
            pin: true,
            anticipatePin: 1,
            fastScrollEnd: true,
          },
        })

        // Split into top and bottom halves and push apart
        tl.to(
          top,
          {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%)",
            y: "-10vw",
          },
          0
        ).to(
          bottom,
          {
            clipPath: "polygon(0% 50%, 100% 50%, 100% 100%, 0% 100%)",
            y: "10vw",
          },
          0
        )
      }, container)
    }

    void setup()

    return () => {
      killed = true
      try {
        ctx?.revert()
      } catch {}
    }
  }, [])

  return (
    <section
      ref={containerRef as any}
      className={[
        "relative h-[100vh] w-full overflow-hidden bg-neutral-950 text-white flex items-center justify-center",
        className,
      ].join(" ")}
      aria-label={`${text} animated split headline`}
    >
      {/* Single semantic heading for accessibility */}
      <h2 className="sr-only">{text}</h2>

      {/* Text layers */}
      <div className="relative w-full max-w-[1400px] px-4">
        {/* Shared text styles */}
        <div
          ref={topRef}
          aria-hidden
          className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
          style={{
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            fontSize: "clamp(64px, 18vw, 260px)",
            textTransform: "uppercase",
          }}
        >
          {text}
        </div>
        <div
          ref={bottomRef}
          aria-hidden
          className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
          style={{
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            fontSize: "clamp(64px, 18vw, 260px)",
            textTransform: "uppercase",
          }}
        >
          {text}
        </div>

        {/* A subtle background gradient glow for depth */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 50%, rgba(255,107,44,0.15), transparent)",
            filter: "blur(20px)",
          }}
        />
      </div>
    </section>
  )
}
