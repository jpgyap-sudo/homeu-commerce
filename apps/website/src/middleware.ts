import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET
)
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required. Set a secure random value (min 32 chars).')
  throw new Error('JWT_SECRET is not configured. Server cannot start safely.')
}
const COOKIE_NAME = 'homeu_admin_session'

// admin.homeatelier.ph (DaVinciOS backend) and store.homeatelier.ph
// (HomeU.PH storefront) are two DNS names pointing at the SAME app/container
// (see tools/nginx-homeu.conf — both proxy to 127.0.0.1:3000). Nginx only
// redirects the bare "/" on admin.* to /admin/login; every other route
// resolves identically on both hostnames with nothing else enforcing the
// split. The block below is the actual boundary. Any other host (localhost,
// preview deployments) skips this and falls through to the JWT gate as before.
const ADMIN_HOST = 'admin.homeatelier.ph'
const STORE_HOST = 'store.homeatelier.ph'
const ALWAYS_ALLOWED = new Set([
  '/robots.txt', '/sitemap.xml', '/manifest.json', '/sw.js', '/favicon.ico',
])

/**
 * Middleware: (1) keeps the admin domain and storefront domain from leaking
 * into each other, then (2) protects all /admin/* routes except /admin/login.
 *
 * Verifies the homeu_admin_session JWT cookie on every request.
 * Redirects unauthenticated users to /admin/login.
 * This is a belt-and-suspenders approach — individual pages also
 * call getSession(), but middleware prevents the page from rendering
 * at all if the cookie is missing or invalid.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()

  if (host === STORE_HOST && pathname.startsWith('/admin')) {
    return NextResponse.redirect(`https://${ADMIN_HOST}${pathname}${request.nextUrl.search}`)
  }
  if (host === ADMIN_HOST && !pathname.startsWith('/admin') && !pathname.startsWith('/api/') && !ALWAYS_ALLOWED.has(pathname)) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Everything below only applies to /admin/* routes — leave storefront
  // requests untouched.
  if (!pathname.startsWith('/admin')) {
    const requestHeaders = new Headers(request.headers)
    if (request.nextUrl.searchParams.has('preview')) {
      requestHeaders.set('x-theme-preview', '1')
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    return NextResponse.next()
  }

  // All /admin/* requests get an internal header so the root layout
  // can detect admin routes even on localhost (where host != admin.*)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-is-admin', '1')

  // Allow public admin routes
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/login/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') // API routes handle their own auth
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Also allow static assets and public files
  if (
    pathname.match(/\.(ico|png|svg|jpg|jpeg|webp|css|js|woff2?)$/) ||
    pathname.startsWith('/admin/login')
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Check for session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verify JWT
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.role === 'customer') {
      if (host === ADMIN_HOST) {
        return NextResponse.redirect(`https://${STORE_HOST}/customer/dashboard`)
      }
      return NextResponse.redirect(new URL('/customer/dashboard', request.url))
    }
    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    // Token invalid or expired — clear it and redirect
    const response = NextResponse.redirect(new URL('/admin/login', request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  // Broadened from '/admin/:path*' so the host-based domain gating above
  // can also catch storefront paths hit on the admin domain (and vice
  // versa) — the function itself exits early via `!pathname.startsWith
  // ('/admin')` for everything the JWT gate doesn't need to see.
  matcher: ['/((?!_next/static|_next/image).*)'],
}
