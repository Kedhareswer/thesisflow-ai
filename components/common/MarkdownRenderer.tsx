"use client"

import React, { useMemo } from "react"

// Lightweight Markdown renderer without external deps
// Supports: headings (#, ##, ###), bold **text**, italic *text*, inline code `code`,
// code blocks ```lang\n...```, bullet lists -, numbered lists 1., links [text](url)

function escapeHtml(text: string) {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

function renderInline(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let remaining = text

  // Process links first: [text](url)
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
  const partsWithLinks: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      partsWithLinks.push(remaining.slice(lastIndex, match.index))
    }
    partsWithLinks.push(
      <a key={`link-${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="underline text-primary hover:opacity-80">
        {match[1]}
      </a>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < remaining.length) {
    partsWithLinks.push(remaining.slice(lastIndex))
  }

  // Now for each part, process bold, italics, and inline code
  const processEmphasis = (str: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = []
    let s = str

    // inline code `code`
    const codeRegex = /`([^`]+)`/g
    let li = 0
    let m: RegExpExecArray | null
    const afterCode: (string | React.ReactNode)[] = []
    while ((m = codeRegex.exec(s)) !== null) {
      if (m.index > li) afterCode.push(s.slice(li, m.index))
      afterCode.push(<code key={`code-${m.index}`} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{m[1]}</code>)
      li = m.index + m[0].length
    }
    if (li < s.length) afterCode.push(s.slice(li))

    const processBoldItalic = (node: string | React.ReactNode, idx: number): React.ReactNode => {
      if (typeof node !== 'string') return node
      const boldRegex = /\*\*([^*]+)\*\*/g
      const italicRegex = /\*([^*]+)\*/g

      // bold
      const boldParts: (string | React.ReactNode)[] = []
      let bi = 0
      let bm: RegExpExecArray | null
      while ((bm = boldRegex.exec(node)) !== null) {
        if (bm.index > bi) boldParts.push(node.slice(bi, bm.index))
        boldParts.push(<strong key={`b-${idx}-${bm.index}`}>{bm[1]}</strong>)
        bi = bm.index + bm[0].length
      }
      if (bi < node.length) boldParts.push(node.slice(bi))

      // italics within remaining strings
      const italicProcessed: React.ReactNode[] = []
      boldParts.forEach((bp, j) => {
        if (typeof bp !== 'string') { italicProcessed.push(bp); return }
        let ii = 0
        let im: RegExpExecArray | null
        while ((im = italicRegex.exec(bp)) !== null) {
          if (im.index > ii) italicProcessed.push(bp.slice(ii, im.index))
          italicProcessed.push(<em key={`i-${idx}-${j}-${im.index}`}>{im[1]}</em>)
          ii = im.index + im[0].length
        }
        if (ii < bp.length) italicProcessed.push(bp.slice(ii))
      })

      return <>{italicProcessed}</>
    }

    afterCode.forEach((n, i) => nodes.push(processBoldItalic(n, i)))
    return nodes
  }

  partsWithLinks.forEach((part, i) => {
    if (typeof part === 'string') {
      elements.push(<React.Fragment key={`frag-${i}`}>{processEmphasis(part)}</React.Fragment>)
    } else {
      elements.push(part)
    }
  })

  return elements
}

function parseMarkdown(content: string): React.ReactNode[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n")
  const nodes: React.ReactNode[] = []

  let inCodeBlock = false
  let codeLang = ""
  let codeLines: string[] = []
  let inList: null | { type: 'ul' | 'ol'; items: React.ReactNode[][] } = null

  const flushParagraph = (buffer: string[]) => {
    if (buffer.length === 0) return
    const text = buffer.join("\n")
    nodes.push(<p className="mb-2" key={`p-${nodes.length}`}>{renderInline(text)}</p>)
    buffer.length = 0
  }

  const flushList = () => {
    if (!inList) return
    if (inList.type === 'ul') {
      nodes.push(
        <ul className="list-disc ml-6 mb-2" key={`ul-${nodes.length}`}>
          {inList.items.map((it, idx) => <li key={`ul-i-${idx}`}>{it}</li>)}
        </ul>
      )
    } else {
      nodes.push(
        <ol className="list-decimal ml-6 mb-2" key={`ol-${nodes.length}`}>
          {inList.items.map((it, idx) => <li key={`ol-i-${idx}`}>{it}</li>)}
        </ol>
      )
    }
    inList = null
  }

  const paragraphBuffer: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // code block fences
    const fenceMatch = line.match(/^```(.*)$/)
    if (fenceMatch) {
      if (!inCodeBlock) {
        flushList()
        flushParagraph(paragraphBuffer)
        inCodeBlock = true
        codeLang = (fenceMatch[1] || '').trim()
        codeLines = []
      } else {
        // close codeblock
        nodes.push(
          <pre className="bg-muted rounded-md p-3 overflow-x-auto text-xs mb-2" key={`pre-${nodes.length}`}>
            <code>{codeLines.join("\n")}</code>
          </pre>
        )
        inCodeBlock = false
        codeLang = ""
        codeLines = []
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    // headings
    const h1 = line.match(/^#\s+(.+)$/)
    const h2 = line.match(/^##\s+(.+)$/)
    const h3 = line.match(/^###\s+(.+)$/)
    if (h1 || h2 || h3) {
      flushList()
      flushParagraph(paragraphBuffer)
      const text = (h1?.[1] || h2?.[1] || h3?.[1] || '').trim()
      if (h1) nodes.push(<h1 className="text-lg font-semibold mt-2 mb-1" key={`h1-${nodes.length}`}>{renderInline(text)}</h1>)
      else if (h2) nodes.push(<h2 className="text-base font-semibold mt-2 mb-1" key={`h2-${nodes.length}`}>{renderInline(text)}</h2>)
      else nodes.push(<h3 className="text-sm font-semibold mt-2 mb-1" key={`h3-${nodes.length}`}>{renderInline(text)}</h3>)
      continue
    }

    // lists
    const ul = line.match(/^\s*[-*]\s+(.+)$/)
    const ol = line.match(/^\s*(\d+)\.\s+(.+)$/)
    if (ul || ol) {
      flushParagraph(paragraphBuffer)
      const itemText = (ul ? ul[1] : ol![2]).trim()
      const itemNodes = renderInline(itemText)
      if (!inList) {
        inList = { type: ul ? 'ul' : 'ol', items: [itemNodes] }
      } else if (inList.type === (ul ? 'ul' : 'ol')) {
        inList.items.push(itemNodes)
      } else {
        flushList()
        inList = { type: ul ? 'ul' : 'ol', items: [itemNodes] }
      }
      continue
    }

    // blank line
    if (/^\s*$/.test(line)) {
      flushList()
      flushParagraph(paragraphBuffer)
      continue
    }

    // default paragraph line
    paragraphBuffer.push(line)
  }

  // flush leftovers
  flushList()
  flushParagraph(paragraphBuffer)

  return nodes
}

export default function MarkdownRenderer({ content }: { content: string }) {
  const nodes = useMemo(() => parseMarkdown(content), [content])
  return (
    <div className="text-sm leading-6 markdown-content">
      {nodes}
    </div>
  )
}
