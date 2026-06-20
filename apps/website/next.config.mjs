/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
      {
        // Cache static assets for 1 year (fingerprinted URLs change on rebuild)
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache fonts for 1 year
        source: '/fonts/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: '/blogs/:handle', destination: '/blog/:handle', permanent: true },
      { source: '/blogs/:handle/:slug', destination: '/blog/:handle/:slug', permanent: true },
      { source: '/customer/login', destination: '/login', permanent: true },
      { source: '/customer/register', destination: '/register', permanent: true },
    ]
  },
}

export default nextConfig
