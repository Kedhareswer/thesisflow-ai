"use client"

import React from "react"

export type LiveCodeWorkbenchHandle = {
  nextSlide: () => void
  prevSlide: () => void
  printPreview: () => void
}

type Props = {
  initialHtml?: string
  initialCss?: string
  title?: string
  html?: string
  css?: string
  onChangeHtml?: (next: string) => void
  onChangeCss?: (next: string) => void
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return v
}

const LiveCodeWorkbench = React.forwardRef<LiveCodeWorkbenchHandle, Props>(function LiveCodeWorkbench(
  { initialHtml = "", initialCss = "", title = "Builder", html: controlledHtml, css: controlledCss, onChangeHtml, onChangeCss }: Props,
  ref
) {
  const [tab, setTab] = React.useState<"html" | "css">("html")
  const [htmlState, setHtmlState] = React.useState(initialHtml)
  const [cssState, setCssState] = React.useState(initialCss)
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null)

  // Sync internal state when initial props change (e.g., template switches)
  React.useEffect(() => { setHtmlState(initialHtml) }, [initialHtml])
  React.useEffect(() => { setCssState(initialCss) }, [initialCss])

  const html = controlledHtml ?? htmlState
  const css = controlledCss ?? cssState

  const handleHtmlChange = (next: string) => {
    if (onChangeHtml) onChangeHtml(next)
    if (controlledHtml === undefined) setHtmlState(next)
  }
  const handleCssChange = (next: string) => {
    if (onChangeCss) onChangeCss(next)
    if (controlledCss === undefined) setCssState(next)
  }

  const dHtml = useDebounced(html, 200)
  const dCss = useDebounced(css, 200)

  const slideMode = React.useMemo(() => /class\s*=\s*\"[^\"]*\bslide\b/i.test(dHtml) || /<section[^>]*class=[^>]*\bslide\b/i.test(dHtml), [dHtml])

  const srcDoc = React.useMemo(() => {
    const navScript = slideMode
      ? `<script>(function(){
          let idx = 0; let slides = [];
          function show(i){ if(!slides.length) return; idx = (i+slides.length)%slides.length; slides.forEach((s,j)=>{ s.style.display = j===idx? 'flex':'none'; }); }
          window.addEventListener('DOMContentLoaded',()=>{ slides = Array.from(document.querySelectorAll('.slide')); if(slides.length){ slides.forEach(s=>{ s.style.display='none'; s.style.width='100vw'; s.style.height='100vh'; }); show(0); } });
          window.addEventListener('message',(e)=>{ if(!e || !e.data) return; if(e.data.type==='slide-next') show(idx+1); if(e.data.type==='slide-prev') show(idx-1); if(e.data.type==='slide-go' && typeof e.data.index==='number') show(e.data.index); });
          window.addEventListener('keydown',(ev)=>{ if(ev.key==='ArrowRight') show(idx+1); if(ev.key==='ArrowLeft') show(idx-1); });
          window.__slides__ = { next: ()=>show(idx+1), prev: ()=>show(idx-1), go: (i)=>show(i) };
        })();</script>`
      : ''
    return `<!doctype html><html><head><meta charset=\"utf-8\" />
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
      <title>${title}</title>
      <style>
        html,body{margin:0;padding:0}
        ${dCss}
      </style>
    </head><body>
      ${dHtml}
      ${navScript}
    </body></html>`
  }, [dHtml, dCss, title, slideMode])

  const downloadHtml = () => {
    const blob = new Blob([srcDoc], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(title || "project").toLowerCase().replace(/\s+/g, "-")}.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const postToIframe = (msg: any) => {
    const w = iframeRef.current?.contentWindow
    try { w?.postMessage(msg, "*") } catch {}
  }

  const nextSlide = () => postToIframe({ type: 'slide-next' })
  const prevSlide = () => postToIframe({ type: 'slide-prev' })
  const printPreview = () => {
    try { iframeRef.current?.contentWindow?.focus(); iframeRef.current?.contentWindow?.print() } catch {}
  }

  React.useImperativeHandle(ref, () => ({ nextSlide, prevSlide, printPreview }), [])

  React.useEffect(() => {
    if (!slideMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); nextSlide() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slideMode])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setTab("html")} className={`rounded-md border px-2 py-1 ${tab === "html" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-700"}`}>HTML</button>
          <button onClick={() => setTab("css")} className={`rounded-md border px-2 py-1 ${tab === "css" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-700"}`}>CSS</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadHtml} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Download HTML</button>
          {slideMode && (
            <>
              <button onClick={prevSlide} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Prev</button>
              <button onClick={nextSlide} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Next</button>
              <button onClick={printPreview} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Export PDF</button>
            </>
          )}
          <button onClick={() => window.open(URL.createObjectURL(new Blob([srcDoc], { type: "text/html" })), "_blank")} className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600">Open Preview</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Editor</div>
          {tab === "html" ? (
            <textarea value={html} onChange={(e) => handleHtmlChange(e.target.value)} spellCheck={false} className="h-[420px] w-full resize-none p-3 font-mono text-sm text-gray-800 outline-none" />
          ) : (
            <textarea value={css} onChange={(e) => handleCssChange(e.target.value)} spellCheck={false} className="h-[420px] w-full resize-none p-3 font-mono text-sm text-gray-800 outline-none" />
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Live Preview</div>
          <div className="relative">
            <iframe ref={iframeRef} title="preview" className="h-[450px] w-full" sandbox="allow-same-origin allow-scripts" srcDoc={srcDoc} />
            {slideMode && (
              <>
                <button aria-label="Previous slide" onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-sm shadow hover:bg-white">◀</button>
                <button aria-label="Next slide" onClick={nextSlide} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-sm shadow hover:bg-white">▶</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

export default LiveCodeWorkbench
