'use client'

/**
 * Root layout (src/app/layout.tsx) is an async Server Component that calls
 * `await headers()` and branches between an admin shell and the full
 * storefront shell. Next.js auto-generates a /_global-error page for any
 * app without one, and rendering that auto-generated page apparently still
 * routes through (a stripped form of) the root layout — Next 16.2.9 fails
 * to statically prerender that combination ("Invariant: Expected workStore
 * to be initialized") and the build worker that hits it first aborts the
 * whole build.
 *
 * global-error.tsx replaces <html>/<body> entirely and per Next's docs
 * convention is always a Client Component, so it never goes through the
 * async root layout at all — this is the supported way to give the app an
 * error boundary independent of root layout's data fetching.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '80px 24px' }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>
          We hit an unexpected error. Please try again.
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: '10px 24px', background: '#1e7a47', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
