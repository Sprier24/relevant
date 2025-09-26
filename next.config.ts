import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: ['example.com'],
    unoptimized: true,
    dangerouslyAllowSVG: true,
    disableStaticImages: false,
  },
  productionBrowserSourceMaps: false,
  compress: true,
  experimental: {
    externalDir: true,
    fallbackNodePolyfills: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
