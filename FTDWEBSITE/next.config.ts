import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: __dirname },
  serverExternalPackages: ['@libsql/client'],
  images: {
    // Creator avatars / banners / clip thumbnails come from third-party CDNs.
    remotePatterns: [
      { protocol: 'https', hostname: 'files.kick.com' },
      { protocol: 'https', hostname: 'clips.kick.com' },
      { protocol: 'https', hostname: 'stream.kick.com' },
      { protocol: 'https', hostname: 'images.kick.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'd8j0ntlcm91z4.cloudfront.net' },
    ],
    minimumCacheTTL: 14400,
  },
  async redirects() {
    return [
      // The tier board was renamed; old links (and any shared screenshots) keep working.
      { source: '/milestones', destination: '/rewards', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
      {
        // Brand assets are immutable once published.
        source: '/brand/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
