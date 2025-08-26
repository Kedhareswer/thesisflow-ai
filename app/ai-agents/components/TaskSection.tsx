"use client"

import React from "react"

type Option = { id: string; label: string }

type TaskSectionProps = {
  title: string
  options: Option[]
  selected: string[] | string
  onToggle: (id: string) => void
  singleSelect?: boolean
}

export default function TaskSection({ title, options, selected, onToggle, singleSelect }: TaskSectionProps) {
  const isSelected = (id: string) =>
    Array.isArray(selected) ? selected.includes(id) : selected === id

  return (
    <section className="mx-auto w-full max-w-4xl px-4 text-center">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600">{title}</h3>
      <div className="flex flex-wrap justify-center gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              isSelected(opt.id)
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  )
}
