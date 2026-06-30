import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'homeu_admin_session'

function getJwtSecret(): Uint8Array {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required. Set a secure random value (min 32 chars).')
    throw new Error('JWT_SECRET is not configured. Server cannot start safely.')
  }
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

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

const ALLOWED_ORIGINS = new Set([
  'https://admin.homeatelier.ph',
  'https://store.homeatelier.ph',
  'http://localhost:3000',
])

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function addSecurityHeaders(headers: Headers): void {
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
}

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

  // ── Security headers on ALL responses ──────────────────────
  // Applied early; response headers will be merged by NextResponse
  const respHeaders = new Headers()
  addSecurityHeaders(respHeaders)

  // ── CSRF check for admin mutation routes ───────────────────
  if (
    pathname.startsWith('/api/admin/') &&
    MUTATION_METHODS.has(request.method) &&
    !pathname.startsWith('/api/admin/login') &&
    !pathname.startsWith('/api/admin/auth')
  ) {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const valid = origin
      ? ALLOWED_ORIGINS.has(origin)
      : referer
        ? [...ALLOWED_ORIGINS].some(o => referer.startsWith(o))
        : false
    if (!valid) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403, headers: respHeaders })
    }
  }

  if (host === STORE_HOST && pathname.startsWith('/admin')) {
    return NextResponse.redirect(`https://${ADMIN_HOST}${pathname}${request.nextUrl.search}`, { headers: respHeaders })
  }
  if (host === ADMIN_HOST && !pathname.startsWith('/admin') && !pathname.startsWith('/api/') && !ALWAYS_ALLOWED.has(pathname)) {
    return NextResponse.redirect(new URL('/admin/login', request.url), { headers: respHeaders })
  }

  // Everything below only applies to /admin/* routes — leave storefront
  // requests untouched.
  if (!pathname.startsWith('/admin')) {
    const requestHeaders = new Headers(request.headers)
    if (request.nextUrl.searchParams.has('preview')) {
      requestHeaders.set('x-theme-preview', '1')
      return NextResponse.next({ request: { headers: requestHeaders }, headers: respHeaders })
    }
    return NextResponse.next({ headers: respHeaders })
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
    return NextResponse.next({ request: { headers: requestHeaders }, headers: respHeaders })
  }

  // Also allow static assets and public files
  if (
    pathname.match(/\.(ico|png|svg|jpg|jpeg|webp|css|js|woff2?)$/) ||
    pathname.startsWith('/admin/login')
  ) {
    return NextResponse.next({ request: { headers: requestHeaders }, headers: respHeaders })
  }

  // Check for session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl, { headers: respHeaders })
  }

  // Verify JWT
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (payload.role === 'customer') {
      if (host === ADMIN_HOST) {
        return NextResponse.redirect(`https://${STORE_HOST}/customer/dashboard`, { headers: respHeaders })
      }
      return NextResponse.redirect(new URL('/customer/dashboard', request.url), { headers: respHeaders })
    }
    return NextResponse.next({ request: { headers: requestHeaders }, headers: respHeaders })
  } catch {
    // Token invalid or expired — clear it and redirect
    const response = NextResponse.redirect(new URL('/admin/login', request.url), { headers: respHeaders })
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
