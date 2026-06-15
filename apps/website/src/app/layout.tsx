import './globals.css'
import './components/chat/chat.css'
import { QuoteCartBadge } from '@/components/QuoteCart'
import { ChatWidget } from '@/components/chat/ChatWidget'

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
