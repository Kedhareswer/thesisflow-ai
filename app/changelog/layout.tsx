import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thesisflow-ai.vercel.app'

export const metadata: Metadata = {
  title: 'Changelog — ThesisFlow-AI',
  description: 'Latest releases, improvements, and fixes for ThesisFlow-AI. Follow rapid shipping across AI chat, research tools, extraction, and UX.',
  alternates: {
    canonical: siteUrl + '/changelog',
    types: {
      'application/rss+xml': siteUrl + '/changelog/rss.xml',
      'application/atom+xml': siteUrl + '/changelog/atom.xml',
    },
  },
  openGraph: {
    title: 'Changelog — ThesisFlow-AI',
    description: 'Latest releases, improvements, and fixes for ThesisFlow-AI.',
    url: siteUrl + '/changelog',
    siteName: 'ThesisFlow-AI',
    images: [{ url: siteUrl + '/v2.png', width: 1200, height: 630, alt: 'ThesisFlow-AI — Changelog' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Changelog — ThesisFlow-AI',
    description: 'Latest releases, improvements, and fixes for ThesisFlow-AI.',
    images: [siteUrl + '/v2.png'],
    site: '@ThesisFlowAI',
    creator: '@ThesisFlowAI',
  },
}

export default function ChangelogLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
