"use client"

import React from "react"

type PopularTasksProps = {
  onPick: (wantId: string, subject: string, useIds?: string[], makeIds?: string[]) => void
}

export default function PopularTasks({ onPick }: PopularTasksProps) {
  const examples = [
    { want: "search_papers", subject: "large language models for healthcare", use: ["google_scholar", "arxiv"], make: ["pdf_report"] },
    { want: "review_literature", subject: "climate change impacts on crops", use: ["deep_review"], make: ["ppt_presentation"] },
    { want: "write_report", subject: "AI ethics in education", use: ["google_scholar"], make: ["word_document"] },
  ]

  return (
    <section className="mx-auto w-full max-w-4xl px-4 text-center">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600">Popular Tasks</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 justify-items-center">
        {examples.map((ex, idx) => (
          <button
            key={idx}
            onClick={() => onPick(ex.want, ex.subject, ex.use, ex.make)}
            className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm hover:shadow"
          >
            <div className="text-sm text-gray-500">Example</div>
            <div className="mt-1 font-medium text-gray-800">{ex.want.replace(/_/g, " ")}</div>
            <div className="text-sm text-gray-700">on {ex.subject}</div>
          </button>
        ))}
      </div>
    </section>
  )
}
