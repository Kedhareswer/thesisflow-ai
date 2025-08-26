"use client"

import React from "react"

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-6xl items-center justify-end px-4 py-3">
        <button className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600">
          Pricing
        </button>
      </div>
    </header>
  )
}
