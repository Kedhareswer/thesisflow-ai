import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thesisflow-ai.vercel.app'

export const metadata: Metadata = {
  title: 'ThesisFlow-AI — AI Research Platform',
  description:
    'Accelerate your research with AI. Discover papers, summarize instantly, plan projects, and collaborate seamlessly.',
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
  alternates: {
    canonical: siteUrl + '/',
  },
  openGraph: {
    title: 'ThesisFlow-AI — AI Research Platform',
    description:
      'Accelerate your research with AI. Discover papers, summarize instantly, plan projects, and collaborate seamlessly.',
    url: siteUrl + '/',
    siteName: 'ThesisFlow-AI',
    images: [
      {
        url: siteUrl + '/v2.png',
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
      'Accelerate your research with AI. Discover papers, summarize instantly, plan projects, and collaborate seamlessly.',
    images: [siteUrl + '/v2.png'],
    site: '@ThesisFlowAI',
    creator: '@ThesisFlowAI',
  },
}
