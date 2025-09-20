import type { Metadata } from 'next'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://thesisflow-ai.vercel.app').replace(/\/+$/, '')

export const metadata: Metadata = {
  title: 'Research Explorer — ThesisFlow-AI',
  description:
    'Discover and analyze research papers with AI-powered tools. Multi-source search, topic exploration, idea generation, and an integrated research assistant in one place.',
  alternates: {
    canonical: siteUrl + '/explorer',
  },
  openGraph: {
    title: 'Research Explorer — ThesisFlow-AI',
    description:
      'AI-powered discovery across OpenAlex, Semantic Scholar, arXiv, and more. Explore topics, generate ideas, and chat with a research-aware assistant.',
    url: siteUrl + '/explorer',
    siteName: 'ThesisFlow-AI',
    images: [
      {
        url: siteUrl + '/v2.png',
        width: 1200,
        height: 630,
        alt: 'ThesisFlow-AI — Research Explorer',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Research Explorer — ThesisFlow-AI',
    description:
      'Discover and analyze research papers with AI-powered tools. Multi-source search, topic exploration, idea generation, and an integrated research assistant.',
    images: [siteUrl + '/v2.png'],
    site: '@ThesisFlowAI',
    creator: '@ThesisFlowAI',
  },
}
