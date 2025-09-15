"use client"

import React from "react"
import { LetterReveal } from "./letter-reveal"

export interface HomeLoaderProps {
  text?: string
  /** Total on-screen time including the entry, before starting fade-out */
  showMs?: number
  /** Fade-out duration in ms */
  fadeDurationMs?: number
  /** Background color for the fullscreen overlay */
  bgColor?: string
  /** Optional className for the outer overlay */
  className?: string
}

/**
 * HomeLoader displays a fullscreen overlay with a per-letter reveal animation for the brand text
 * and then fades out smoothly (match-cut feel) after a fixed time.
 */
export function HomeLoader({
  text = "Thesis Flow",
  showMs = 5000,
  fadeDurationMs = 600,
  bgColor = "#fe7a41",
  className,
}: HomeLoaderProps) {
  const [fadingOut, setFadingOut] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)

  React.useEffect(() => {
    const startFadeAt = Math.max(0, showMs - fadeDurationMs)
    const fadeTimer = setTimeout(() => setFadingOut(true), startFadeAt)
    const hideTimer = setTimeout(() => setHidden(true), showMs)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [showMs, fadeDurationMs])

  if (hidden) return null

  return (
    <div
      className={
        `fixed inset-0 z-[1000] flex items-center justify-center ` +
        `${fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"} ` +
        `transition-opacity ease-out ` +
        (className || "")
      }
      style={{ backgroundColor: bgColor, transition: `opacity ${fadeDurationMs}ms ease-out` }}
      aria-hidden
    >
      <div className="relative select-none">
        <LetterReveal
          text={text}
          color="#ffffff"
          letterDurationMs={800}
          letterStaggerMs={90}
          className="block text-[20vw] md:text-[14vw] xl:text-[10vw] 2xl:text-[9vw] font-extrabold"
        />
        {/* Subtle scale-in on load and slight scale-down on fade for match-cut feel */}
        <style jsx>{`
          div :global(span[id]) {
            /* noop - keep slot for potential id styling */
          }
        `}</style>
      </div>
    </div>
  )
}
