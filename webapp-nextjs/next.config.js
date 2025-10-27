/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Cache Components for Next.js 16
  cacheComponents: true,
  
  images: {
    // Updated for Next.js 16 - domains is deprecated, use remotePatterns only
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.changes.tg',
        port: '',
        pathname: '/gifts/**',
      },
      {
        protocol: 'https',
        hostname: 'telegram.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ed0dcebbf091.ngrok-free.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '4bf10572601e.ngrok-free.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'giftschart.01studio.xyz',
        port: '',
        pathname: '/**',
      },
    ],
    // Updated defaults for Next.js 16
    minimumCacheTTL: 14400, // 4 hours (new default)
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Removed 16 from default
    qualities: [75], // New default
    dangerouslyAllowLocalIP: false, // New security restriction
    maximumRedirects: 3, // New default
  },
  experimental: {
    // Enable Turbopack filesystem caching for development
    turbopackFileSystemCacheForDev: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // Removed nosniff to allow proper script loading
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;
