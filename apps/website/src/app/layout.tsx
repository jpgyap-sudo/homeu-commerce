import './globals.css'
import '../components/chat/chat.css'
import { headers } from 'next/headers'
import { QuoteCartBadge } from '@/components/QuoteCart'
import { ChatWidget } from '@/components/chat/ChatWidget'

/**
 * HomeU Root Layout
 *
 * Renders the storefront for non-admin domains.
 * For admin.homeu.ph / admin.homeatelier.ph, the layout
 * is minimal since the admin pages have their own layout.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const host = headersList.get('host') || ''

  // Admin domains: just pass children through (admin pages have their own layout)
  if (host.startsWith('admin.')) {
    return (
      <html lang="en" data-theme="light">
        <body>{children}</body>
      </html>
    )
  }

  // Storefront: full layout with header, nav, chat
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a className="site-logo" href="/">HOMEU.PH</a>
          <nav aria-label="Storefront navigation">
            <a href="/products">Products</a>
            <a href="/customer/dashboard">My RFQs</a>
            <QuoteCartBadge />
          </nav>
        </header>
        {children}
        <ChatWidget />
      </body>
    </html>
  )
}
