"use client";

import React, { useRef, useEffect } from "react";

/** Inline Noise overlay (no external imports). */
interface NoiseProps {
  patternSize?: number;
  patternScaleX?: number;
  patternScaleY?: number;
  patternRefreshInterval?: number;
  patternAlpha?: number; // 0–255
  coverViewport?: boolean; // when false, fills parent
}

const Noise: React.FC<NoiseProps> = ({
  patternSize = 250, // (reserved for future scaling)
  patternScaleX = 1,  // (reserved)
  patternScaleY = 1,  // (reserved)
  patternRefreshInterval = 2,
  patternAlpha = 15,
  coverViewport = true,
}) => {
  const grainRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let frame = 0;
    let animationId = 0;
    const canvasSize = 1024;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      // Fill area
      canvas.style.width = coverViewport ? "100vw" : "100%";
      canvas.style.height = coverViewport ? "100vh" : "100%";
    };

    const drawGrain = () => {
      const imageData = ctx.createImageData(canvasSize, canvasSize);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = patternAlpha;
      }
      ctx.putImageData(imageData, 0, 0);
    };

    const loop = () => {
      if (frame % patternRefreshInterval === 0) drawGrain();
      frame++;
      animationId = window.requestAnimationFrame(loop);
    };

    window.addEventListener("resize", resize);
    resize();
    loop();

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationId);
    };
  }, [patternSize, patternScaleX, patternScaleY, patternRefreshInterval, patternAlpha, coverViewport]);

  return (
    <canvas
      ref={grainRef}
      className="pointer-events-none absolute inset-0"
      style={{ imageRendering: "pixelated" }}
    />
  );
};

/** Gradient + Noise (applied to one of our previous dark radial variants). */
export default function Component({ scoped = false }: { scoped?: boolean }) {
  return (
    <div className={`${scoped ? 'absolute' : 'fixed'} inset-0 -z-10 bg-slate-950`}>
      {/* Radial spotlight (brand orange) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_560px_at_50%_200px,#FF6B2C,transparent)]" />
      {/* Grain overlay */}
      <Noise patternRefreshInterval={2} patternAlpha={18} coverViewport={!scoped} />
    </div>
  );
}
