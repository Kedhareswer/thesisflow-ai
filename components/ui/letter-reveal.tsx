"use client"

import React from "react"

export interface LetterRevealProps {
  text: string
  className?: string
  letterDurationMs?: number
  letterStaggerMs?: number
  color?: string
  id?: string
}

/**
 * LetterReveal renders a per-letter slide-and-reveal animation using clip-path + translateY.
 * - Uses inline styles for per-letter animation delay and initial transform/opacity/clip-path
 * - Defines keyframes locally via styled-jsx to keep component self-contained
 */
export function LetterReveal({
  text,
  className,
  letterDurationMs = 800,
  letterStaggerMs = 100,
  color = "#ffffff",
  id,
}: LetterRevealProps) {
  const safeId = id || undefined
  const letters = Array.from(text)

  return (
    <span
      id={safeId}
      className={
        className ||
        "block text-[22vw] md:text-[16vw] xl:text-[12vw] 2xl:text-[10vw] font-extrabold"
      }
      style={{ overflow: "hidden", color }}
    >
      {letters.map((char, index) => {
        if (char === " ") {
          // Render a non-animated space using a fixed-width spacer
          return <span key={index} style={{ display: "inline-block", width: "0.5ch" }}>&nbsp;</span>
        }
        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              animation: `tf-letterSlideIn ${letterDurationMs}ms ease-out forwards`,
              animationDelay: `${index * letterStaggerMs}ms`,
              transform: "translateY(-100%)",
              opacity: 0,
              clipPath: "inset(0 0 100% 0)",
            }}
          >
            {char}
          </span>
        )
      })}

      <style jsx>{`
        @keyframes tf-letterSlideIn {
          0% {
            transform: translateY(-100%);
            opacity: 0;
            clip-path: inset(0 0 100% 0);
          }
          50% {
            opacity: 0.5;
            clip-path: inset(0 0 50% 0);
          }
          100% {
            transform: translateY(0);
            opacity: 1;
            clip-path: inset(0 0 0% 0);
          }
        }
      `}</style>
    </span>
  )
}
