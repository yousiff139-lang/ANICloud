import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://anicloud-production.up.railway.app'

  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/settings/', '/profile/'],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/settings/', '/profile/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
