/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // imapflow/mailparser (used by lib/mail-client.ts for the email inbox IMAP
  // sync) were silently missing from the standalone build's node_modules —
  // Next's automatic dependency tracer doesn't always catch packages with
  // dynamic requires. This forces them (and their actual deps) to be traced
  // and copied in, instead of webpack-bundling them.
  // imapflow/mailparser are used by lib/mail-client.ts for the email inbox IMAP sync
  // pg/pg-connection-string are used by lib/db.ts (loaded from instrumentation.ts via
  // rfq-cleanup-sweep.ts) — these are Node.js native modules that must not be bundled.
  serverExternalPackages: ['imapflow', 'mailparser', 'pg', 'pg-connection-string'],
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
        // Service workers must revalidate on every registration/update check.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
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
