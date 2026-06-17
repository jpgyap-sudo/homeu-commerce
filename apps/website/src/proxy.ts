import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'homeu-admin-secret-change-in-production'
)
const COOKIE_NAME = 'homeu_admin_session'

/**
 * Proxy: protects all /admin/* routes except /admin/login.
 *
 * Verifies the homeu_admin_session JWT cookie on every request.
 * Redirects unauthenticated users to /admin/login.
 * This is a belt-and-suspenders approach — individual pages also
 * call getSession(), but the proxy prevents the page from rendering
 * at all if the cookie is missing or invalid.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

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
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    // Token invalid or expired — clear it and redirect
    const response = NextResponse.redirect(new URL('/admin/login', request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: ['/admin/:path*'],
}
