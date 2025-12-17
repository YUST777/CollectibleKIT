import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/apply',
                    '/sessions',
                    '/images/',
                    '/logos/',
                    '/videos/',
                    '/3d/',
                ],
                disallow: ['/admin', '/api', '/dashboard'],
            },
            {
                userAgent: 'Googlebot',
                allow: ['/'],
                disallow: ['/admin', '/api', '/dashboard'],
            },
            {
                userAgent: 'Bingbot',
                allow: ['/'],
                disallow: ['/admin', '/api', '/dashboard'],
            },
        ],
        sitemap: 'https://icpchue.xyz/sitemap.xml',
    };
}
