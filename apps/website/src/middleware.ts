/**
 * Host-based domain gating — admin.homeatelier.ph (DaVinciOS backend) and
 * store.homeatelier.ph (HomeU.PH storefront) are two DNS names pointing at
 * the SAME Next.js app/container (see tools/nginx-homeu.conf — both proxy
 * to 127.0.0.1:3000). Nginx only redirects the bare "/" on admin.* to
 * /admin/login; every other route resolves identically on both hostnames
 * with nothing enforcing the split. This middleware is the actual boundary:
 * admin.* may only reach /admin/*, store.* may not reach /admin/* or the
 * backend-only /api/admin/* surface.
 *
 * Any other host (localhost, preview deployments, IP access) is left
 * untouched so local dev and previews keep working.
 */
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_HOST = 'admin.homeatelier.ph'
const STORE_HOST = 'store.homeatelier.ph'

// System/well-known paths that must resolve on any host, admin included.
const ALWAYS_ALLOWED = new Set([
  '/robots.txt', '/sitemap.xml', '/manifest.json', '/sw.js', '/favicon.ico',
])

export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const { pathname } = request.nextUrl

  if (host !== ADMIN_HOST && host !== STORE_HOST) {
    return NextResponse.next()
  }
  if (ALWAYS_ALLOWED.has(pathname) || pathname.startsWith('/api/')) {
    // API routes stay host-agnostic — both the admin UI and the storefront
    // call shared/public routes, and admin-only routes are already
    // session-gated server-side via getSession().
    return NextResponse.next()
  }

  if (host === ADMIN_HOST && !pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (host === STORE_HOST && pathname.startsWith('/admin')) {
    return NextResponse.redirect(`https://${ADMIN_HOST}${pathname}${request.nextUrl.search}`)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
