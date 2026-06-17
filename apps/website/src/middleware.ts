import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'homeu-admin-secret-change-in-production'
)
const COOKIE_NAME = 'homeu_admin_session'

/**
 * Middleware: protects all /admin/* routes except /admin/login.
 *
 * Verifies the homeu_admin_session JWT cookie on every request.
 * Redirects unauthenticated users to /admin/login.
 * This is a belt-and-suspenders approach — individual pages also
 * call getSession(), but middleware prevents the page from rendering
 * at all if the cookie is missing or invalid.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public admin routes
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/login/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') // API routes handle their own auth
  ) {
    return NextResponse.next()
  }

  // Also allow static assets and public files
  if (
    pathname.match(/\.(ico|png|svg|jpg|jpeg|webp|css|js|woff2?)$/) ||
    pathname.startsWith('/admin/login')
  ) {
    return NextResponse.next()
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
    return NextResponse.next()
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
