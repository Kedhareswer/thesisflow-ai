"use client"

import React from "react"

export default function MainContent() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero only */}
        <section className="mx-auto max-w-4xl px-4 pt-16 pb-16 text-center">
          <div className="mb-4 mx-auto inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700">
            <span>✨</span>
            <span>Newly Launched</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Everyday Research Tasks</h1>
          <p className="mt-2 max-w-2xl mx-auto text-gray-600">
            Compose, search, and build outputs for your academic work with ThesisFlow-AI.
          </p>
        </section>
      </main>
    </div>
  )
}
