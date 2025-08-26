"use client"

import React from "react"

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-3 md:grid-cols-5">
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Tools</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>AI Agent</li>
            <li>AI Writer</li>
            <li>Chat with PDF</li>
            <li>Literature Review</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600">ThesisFlow-AI</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>About</li>
            <li>Pricing</li>
            <li>Blog</li>
            <li>Careers</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Directories</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>Collections</li>
            <li>Templates</li>
            <li>Guides</li>
            <li>Resources</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Extensions & Apps</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>Chrome</li>
            <li>Edge</li>
            <li>VS Code</li>
            <li>Notion</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Contact</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>support@thesisflow.ai</li>
            <li>Twitter</li>
            <li>LinkedIn</li>
            <li>GitHub</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-6 text-sm text-gray-600">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-orange-500 text-white font-semibold">T</div>
          <span className="font-semibold text-gray-800">ThesisFlow-AI</span>
          <span className="ml-auto">© {new Date().getFullYear()} ThesisFlow-AI. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
