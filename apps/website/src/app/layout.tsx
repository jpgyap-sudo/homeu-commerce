import './globals.css'
import '../components/chat/chat.css'
import { headers } from 'next/headers'
import { QuoteCartBadge } from '@/components/QuoteCart'
import { ChatWidget } from '@/components/chat/ChatWidget'

/**
 * HomeU Root Layout
 * 
 * Renders the base HTML structure. For storefront pages (non-admin domains),
 * it includes the site header and chat widget. The DaVinciOS admin route group
 * uses AdminLayout which adds admin-specific providers WITHOUT nesting
 * additional <html>/<body> tags (avoiding React Error #418).
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const isAdminDomain = host.startsWith('admin.')

  // For admin domain: minimal html/body with light theme (DaVinciOS admin CSS needs data-theme)
  if (isAdminDomain) {
    return (
      <html lang="en" data-theme="light">
        <body>{children}</body>
      </html>
    )
  }

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
