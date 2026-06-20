import './globals.css'
import '../components/chat/chat.css'
import { headers } from 'next/headers'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getMainNav } from '@/lib/navigation'
import { getCustomCss, getHeaderSettings, getThemePalette, headerFontGoogleQuery } from '@/lib/theme'
import siteConfig from '@/data/site-config.json'

export const metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.tagline,
  metadataBase: new URL(`https://${siteConfig.domain}`),
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
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
  const [mainNav, customCss, header, palette] = await Promise.all([getMainNav(), getCustomCss(), getHeaderSettings(), getThemePalette()])
  const announcement = header.announcement?.enabled ? header.announcement : null
  const headerCss = `:root{--debut-header-bg:${header.bgColor};--debut-header-text:${header.textColor};}`
    + `.site-header{position:${header.sticky ? 'sticky' : 'static'};${header.fontFamily ? `font-family:${header.fontFamily};` : ''}}`
    + `.site-header__logo-image{max-width:${header.logoMaxWidth}px;}`
    + `.site-nav__link--main,.mobile-nav__link{font-size:${header.navFontSize || 13}px;}`
    + (announcement ? `.homeu-announcement-bar{background:${announcement.bgColor};color:${announcement.textColor};text-align:center;padding:10px 16px;font-size:14px;font-weight:600;}` : '')
  // Theme palette CSS custom properties — available to all sections
  const paletteCss = `:root{`
    + `--theme-primary:${palette.primaryColor};`
    + `--theme-secondary:${palette.secondaryColor};`
    + `--theme-accent:${palette.accentColor};`
    + `--theme-heading-font:${palette.headingFont};`
    + `--theme-body-font:${palette.bodyFont};`
    + `--theme-button-radius:${palette.buttonRadius}px;`
    + `}`
    + `h1,h2,h3,h4,h5,h6,.h1,.h2,.h3,.h4,.h5,.h6{font-family:${palette.headingFont};}`
    + `body{font-family:${palette.bodyFont};}`
    + `.btn{border-radius:${palette.buttonRadius}px;}`
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
        {/* Theme palette CSS custom properties (Theme → Palette) */}
        <style id="homeu-palette-css" dangerouslySetInnerHTML={{ __html: paletteCss }} />
        {/* Admin-editable custom CSS (Theme → Custom CSS) */}
        {customCss ? <style id="homeu-custom-css" dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
      </head>
      <body>
        <SiteHeader nav={mainNav} header={header} logoUrl={header.logoUrl || undefined} />
        <main id="MainContent" className="content-for-layout" role="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <ChatWidget />
      </body>
    </html>
  )
}
