"use client";

import React from "react";

interface BannerUIProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  className?: string;
}

export default function BannerUI({
  title = "Accelerate Your Research with ThesisFlow-AI",
  subtitle = "Discover papers, summarize instantly, and plan projects with our all-in-one AI platform for scholars and professionals.",
  buttonText = "Get Started",
  onButtonClick,
  className = ""
}: BannerUIProps) {
  return (
    <section className={`flex flex-col items-center justify-center mx-auto max-md:mx-2 max-md:px-2 max-w-5xl w-full text-center rounded-2xl py-20 md:py-24 bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] ${className}`}>
      <h1 className="text-2xl md:text-3xl font-medium text-white max-w-2xl">{title}</h1>
      <div className="h-[3px] w-32 my-1 bg-gradient-to-l from-transparent to-white"></div>
      <p className="text-sm md:text-base text-white max-w-xl">
        {subtitle}
      </p>
      <button 
        className="px-10 py-3 mt-4 text-sm bg-white hover:scale-105 transition duration-300 rounded-full"
        onClick={onButtonClick}
      >
        {buttonText}
      </button>
    </section>
  );
}
