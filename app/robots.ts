import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://thesisflow-ai.vercel.app').replace(/\/+$/, '')

  const allow = ['/', '/_next/static/', '/_next/image/']
  const disallow = [
    '/api/',
    '/api/auth/',
    '/api/ai/',
    '/dashboard/',
    '/profile/',
    '/settings/',
    '/admin/',
    '/team/*/private/',
    '/project/*/private/',
    '/document/*/private/',
    '/login',
    '/signup',
    '/reset-password',
    '/forgot-password',
    '/checkout/',
    '/billing/',
    '/subscription/',
    '/uploads/',
    '/temp/',
    '/cache/',
    '/logs/',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow,
        disallow,
      },
      {
        userAgent: 'Googlebot',
        allow,
        disallow,
      },
      {
        userAgent: 'Bingbot',
        allow,
        disallow,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
