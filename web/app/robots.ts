import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://w-timer.com'

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',
                '/admin/',
                '/dashboard/',
                '/billing/',
                '/analytics/',
                '/verify-email',
                '/reset-password',
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
