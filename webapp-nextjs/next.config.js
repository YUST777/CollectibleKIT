/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'cdn.changes.tg',
      'telegram.org',
      'localhost',
      'ed0dcebbf091.ngrok-free.app',
      '4bf10572601e.ngrok-free.app'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.changes.tg',
        port: '',
        pathname: '/gifts/**',
      },
    ],
  },
  experimental: {},
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
