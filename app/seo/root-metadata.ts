import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thesisflow-ai.vercel.app'

export const metadata: Metadata = {
  title: 'AI Research Platform — Discover & Collaborate | ThesisFlow-AI',
  description:
    'Discover papers, summarize instantly, and plan projects with AI. All-in-one research platform for scholars.',
  applicationName: 'ThesisFlow-AI',
  keywords: [
    'AI research platform',
    'academic summarizer',
    'research collaboration tool',
    'AI paper summarizer',
    'thesis assistant',
    'research assistant',
    'research productivity software'
  ],
  generator: 'v0.dev',
  openGraph: {
    title: 'ThesisFlow-AI — AI Research Platform',
    description:
      'Discover papers, summarize instantly, and plan projects with an all-in-one AI platform for scholars and professionals.',
    url: siteUrl + '/',
    siteName: 'ThesisFlow-AI',
    images: [
      {
        url: siteUrl + '/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: 'ThesisFlow-AI — Accelerate your research with AI',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ThesisFlow-AI — AI Research Platform',
    description:
      'Discover papers, summarize instantly, and plan projects with an all-in-one AI platform for scholars and professionals.',
    images: [siteUrl + '/og-image-1200x630.png'],
    site: '@ThesisFlowAI',
    creator: '@ThesisFlowAI',
  },
}
