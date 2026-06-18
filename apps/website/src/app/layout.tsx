import './globals.css'
import '../components/chat/chat.css'
import { headers } from 'next/headers'
import { QuoteCartBadge } from '@/components/QuoteCart'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getMainNav } from '@/lib/navigation'
import { getCustomCss, getHeaderSettings, headerFontGoogleQuery } from '@/lib/theme'
import siteConfig from '@/data/site-config.json'

export const metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.tagline,
  metadataBase: new URL(`https://${siteConfig.domain}`),
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const isAdmin = headersList.get('x-is-admin') === '1'

  // Admin: minimal pass-through (admin pages have their own layout)
  // Matched by subdomain (production) OR proxy header (localhost dev)
  if (host.startsWith('admin.') || isAdmin) {
    return (
      <html lang="en" data-theme="light">
        <body>{children}</body>
      </html>
    )
  }

  // Storefront: full Debut-themed layout
  const [mainNav, customCss, header] = await Promise.all([getMainNav(), getCustomCss(), getHeaderSettings()])
  const headerCss = `:root{--debut-header-bg:${header.bgColor};--debut-header-text:${header.textColor};}`
    + `.site-header{position:${header.sticky ? 'sticky' : 'static'};${header.fontFamily ? `font-family:${header.fontFamily};` : ''}}`
    + `.site-header__logo-image{max-width:${header.logoMaxWidth}px;}`
    + `.site-nav__link--main,.mobile-nav__link{font-size:${header.navFontSize || 13}px;}`
  const headerFontQuery = headerFontGoogleQuery(header.fontFamily)
  return (
    <html lang="en">
      <head>
        {/* Debut compiled theme CSS — same CSS classes as the live Shopify store */}
        <link rel="stylesheet" href="/debut-theme.css" />
        {/* RSS autodiscovery */}
        <link rel="alternate" type="application/rss+xml" title="HomeU Journal" href="/feed.xml" />
        {/* Judge.me review widgets — add PUBLIC_TOKEN from judge.me dashboard → Settings → API */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.jdgm = window.jdgm || {}; window.jdgm.SHOP_DOMAIN = 'homeu-ph.myshopify.com'; window.jdgm.PUBLIC_TOKEN = '';`,
          }}
        />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.judge.me/widget.js" async={true}></script>
        {/* Admin-editable header appearance (Theme → Header) */}
        {headerFontQuery ? <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${headerFontQuery}&display=swap`} /> : null}
        <style id="homeu-header-css" dangerouslySetInnerHTML={{ __html: headerCss }} />
        {/* Admin-editable custom CSS (Theme → Custom CSS) */}
        {customCss ? <style id="homeu-custom-css" dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
      </head>
      <body>
        <SiteHeader nav={mainNav} logoUrl={header.logoUrl || undefined} />
        <main id="MainContent" className="content-for-layout" role="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999 }}>
          <QuoteCartBadge />
        </div>
        <ChatWidget />
      </body>
    </html>
  )
}
