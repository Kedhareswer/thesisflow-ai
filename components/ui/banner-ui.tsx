"use client";

import React from "react";

export default function BannerUI() {
    return (
        <section className="flex flex-col items-center justify-center mx-auto max-md:mx-2 max-md:px-2 max-w-5xl w-full text-center rounded-2xl py-20 md:py-24 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat">
            <h1 className="text-2xl md:text-3xl font-medium text-white max-w-2xl">Empower Your Research with ThesisFlow-AI</h1>
            <div className="h-[3px] w-32 my-1 bg-gradient-to-l from-transparent to-white"></div>
            <p className="text-sm md:text-base text-white max-w-xl">
                Leverage AI tools for research discovery, analysis, and collaboration at scale.
            </p>
            <button className="px-10 py-3 mt-4 text-sm bg-white hover:scale-105 transition duration-300 rounded-full">
                Get Started
            </button>
        </section>
    );
}
