import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thesisflow-ai.vercel.app'
  const today = new Date()

  const urls: string[] = [
    '/',
    '/changelog',
    '/explorer',
    '/summarizer',
    '/writer',
    '/collaborate',
    '/planner',
    '/ai-assistant',
    '/research-assistant',
    '/pricing',
    '/about',
    '/contact',
    '/help',
    '/docs',
    '/terms',
    '/privacy',
    '/checkout/success',
  ]

  return urls.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: today,
    changeFrequency: path === '/' ? 'weekly' : path.startsWith('/checkout') ? 'never' : 'monthly',
    priority: path === '/' ? 1 : path === '/explorer' || path === '/summarizer' || path === '/writer' ? 0.9 : 0.6,
  }))
}
