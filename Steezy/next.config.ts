import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: __dirname },
  serverExternalPackages: ['pg'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'files.kick.com' },
      { protocol: 'https', hostname: 'clips.kick.com' },
      { protocol: 'https', hostname: 'roobet.com' },
    ],
  },
  // The bonus hunt and tournament moved to MattySpins' paths; old links and bookmarks still land.
  async redirects() {
    return [
      { source: '/hunts', destination: '/hunt', permanent: true },
      { source: '/admin/hunts/:path*', destination: '/admin/hunt', permanent: true },
      { source: '/admin/hunts', destination: '/admin/hunt', permanent: true },
      { source: '/admin/tournaments/:path*', destination: '/admin/tournament', permanent: true },
      { source: '/admin/tournaments', destination: '/admin/tournament', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
      {
        // Everything except the OBS overlays may not be framed. Overlays are loaded
        // by OBS as browser sources, which is not framing, so they need no exception.
        source: '/((?!overlay).*)',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ];
  },
};

export default nextConfig;
