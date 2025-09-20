import type { Metadata } from 'next'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://thesisflow-ai.vercel.app').replace(/\/+$/, '')

export const metadata: Metadata = {
  title: 'Smart Summarizer — ThesisFlow-AI',
  description:
    'Summarize PDFs, DOCX, URLs, and text with AI. Key points, sentiment, reading time, and export options built-in — powered by multiple AI providers.',
  alternates: {
    canonical: siteUrl + '/summarizer',
  },
  openGraph: {
    title: 'Smart Summarizer — ThesisFlow-AI',
    description:
      'Multi-format AI summarization with analytics: key points, compression ratio, sentiment, reading time. Supports OpenAI, Gemini, Claude, Groq.',
    url: siteUrl + '/summarizer',
    siteName: 'ThesisFlow-AI',
    images: [
      {
        url: siteUrl + '/v2.png',
        width: 1200,
        height: 630,
        alt: 'ThesisFlow-AI — Smart Summarizer',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart Summarizer — ThesisFlow-AI',
    description:
      'Summarize PDFs, DOCX, URLs, and text with AI. Key points, sentiment, reading time, and export options built-in.',
    images: [siteUrl + '/v2.png'],
    site: '@ThesisFlowAI',
    creator: '@ThesisFlowAI',
  },
}
