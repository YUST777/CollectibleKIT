import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',

  // Enable Cache Components (new in Next.js 16)
  // Enable Cache Components (new in Next.js 16)
  cacheComponents: false,

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'codeforces.org',
      },
      {
        protocol: 'https',
        hostname: 'userpic.codeforces.org',
      },
      {
        protocol: 'https',
        hostname: 'leetcode.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.leetcode.com',
      },
    ],
  },

  // Experimental features
  experimental: {
    // Turbopack is default in Next.js 16
  },

  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },

  async rewrites() {
    return [
      {
        source: '/2025/:path*',
        destination: '/Dec/2025/:path*',
      },
    ];
  },
};

export default nextConfig;
