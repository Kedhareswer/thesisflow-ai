import { NextRequest, NextResponse } from 'next/server'
import { withTokenValidation } from '@/lib/middleware/token-middleware'
import { getTrendsJob } from '@/lib/services/trends-job.store'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function renderPdfFromMarkdown(title: string, markdown: string) {
  const pdf = await PDFDocument.create()
  const pageMargin = 54 // 3/4 inch
  const pageWidth = 612 // Letter 8.5in * 72
  const pageHeight = 792 // 11in * 72
  const contentWidth = pageWidth - pageMargin * 2
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const lines = markdown.replace(/\r\n/g, '\n').split('\n')

  let page = pdf.addPage([pageWidth, pageHeight])
  let cursorY = pageHeight - pageMargin

  const drawLine = (text: string, bold = false, size = 11) => {
    const maxWidth = contentWidth
    const words = text.split(' ')
    let line = ''
    const usedFont = bold ? fontBold : font
    const lineHeight = size * 1.38

    const flush = (l: string) => {
      if (!l) return
      if (cursorY < pageMargin + lineHeight) {
        page = pdf.addPage([pageWidth, pageHeight])
        cursorY = pageHeight - pageMargin
      }
      page.drawText(l, {
        x: pageMargin,
        y: cursorY - lineHeight,
        size,
        font: usedFont,
        color: rgb(0,0,0)
      })
      cursorY -= lineHeight
    }

    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      const width = usedFont.widthOfTextAtSize(test, size)
      if (width > maxWidth) {
        flush(line)
        line = w
      } else {
        line = test
      }
    }
    flush(line)
  }

  // Title
  if (title) {
    drawLine(title, true, 16)
    cursorY -= 6
  }

  for (const raw of lines) {
    const text = raw.replace(/\t/g, '    ')
    if (text.startsWith('# ')) {
      cursorY -= 6
      drawLine(text.replace(/^#\s+/, ''), true, 14)
      cursorY -= 6
    } else if (text.startsWith('## ')) {
      cursorY -= 4
      drawLine(text.replace(/^##\s+/, ''), true, 12)
      cursorY -= 4
    } else if (text.startsWith('### ')) {
      drawLine(text.replace(/^###\s+/, ''), true, 11)
    } else if (/^```/.test(text)) {
      // code block start/end: just add spacing
      cursorY -= 6
    } else if (text.startsWith('- ')) {
      drawLine(`• ${text.slice(2)}`, false, 11)
    } else if (text.match(/^\d+\.\s/)) {
      drawLine(text, false, 11)
    } else if (text.trim() === '') {
      cursorY -= 6
    } else {
      drawLine(text, false, 11)
    }
  }

  const bytes = await pdf.save()
  return new Uint8Array(bytes)
}

export const GET = withTokenValidation(
  'trends_job_download',
  async (userId: string, request: NextRequest): Promise<NextResponse> => {
    try {
      const url = new URL(request.url)
      const parts = url.pathname.split('/').filter(Boolean)
      const id = parts[parts.indexOf('jobs') + 1]
      if (!id) return new NextResponse('Missing job id', { status: 400 })
      const job = getTrendsJob(id)
      if (!job) return new NextResponse('Not found', { status: 404 })
      if (job.userId !== userId) return new NextResponse('Forbidden', { status: 403 })

      const format = (url.searchParams.get('format') || 'pdf').toLowerCase()
      const name = `${job.query.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-trends` 
      const md = job.report?.markdown || '# Report\nNo content.'
      const html = job.report?.html || `<pre>${md.replace(/[&<>]/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] as string))}</pre>`

      if (format === 'md' || format === 'markdown') {
        return new NextResponse(md, { status: 200, headers: { 'Content-Type': 'text/markdown', 'Content-Disposition': `attachment; filename="${name}.md"` }})
      }
      if (format === 'html') {
        return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.html"` }})
      }

      const pdf = await renderPdfFromMarkdown(`# ${job.query} — Trends Report`, md)
      return new NextResponse(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}.pdf"` }})
    } catch (e) {
      return new NextResponse('Server error', { status: 500 })
    }
  },
  { context: { origin: 'trends', feature: 'download' } }
)
