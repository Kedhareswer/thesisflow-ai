import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thesisflow-ai.vercel.app'

export const metadata: Metadata = {
  title: 'ThesisFlow-AI — AI Research Platform for Discovery, Summarization, and Collaboration',
  description:
    'Accelerate your research with ThesisFlow-AI. Discover papers, summarize instantly, plan projects, and collaborate with your team — all in one place.',
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
