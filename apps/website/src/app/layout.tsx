import './globals.css'
import '../components/chat/chat.css'
import { headers } from 'next/headers'
import Script from 'next/script'
import { ChatWidget } from '@/components/chat/ChatWidget'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import InstallPrompt from '@/components/InstallPrompt'
import MobileBottomNav from '@/components/MobileBottomNav'
import MobileDrawer from '@/components/MobileDrawer'
import MobileHomepageEnhancer from '@/components/MobileHomepageEnhancer'
import PageViewTracker from '@/components/PageViewTracker'
import LiveVisitorTracker from '@/components/LiveVisitorTracker'
import WebVitalsTracker from '@/components/WebVitalsTracker'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getMainNav } from '@/lib/navigation'
import { getCustomCss, getHeaderSettings, getThemePalette, headerFontGoogleQuery, getSiteFavicon } from '@/lib/theme'
import siteConfig from '@/data/site-config.json'

export const metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.tagline,
  metadataBase: new URL(`https://${siteConfig.domain}`),
  icons: { apple: '/icons/icon-192x192.png' },
  manifest: '/manifest.json',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Home Atelier',
    'application-name': 'Home Atelier',
    'theme-color': '#1e7a47',
    'msapplication-TileColor': '#1e7a47',
    'msapplication-TileImage': '/icons/icon-192x192.png',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const isAdmin = headersList.get('x-is-admin') === '1'

  // Admin: minimal pass-through (admin pages have their own layout)
  // Matched by subdomain (production) OR proxy header (localhost dev)
  // Note: deliberately NO service worker on admin (sensitive data, never cache)
  if (host.startsWith('admin.') || isAdmin) {
    return (
      <html lang="en" data-theme="light">
        <head>
          <meta name="theme-color" content="#1e7a47" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        </head>
        <body>{children}</body>
      </html>
    )
  }

  // Storefront: full Debut-themed layout
  const [mainNav, customCss, header, palette, favicon] = await Promise.all([getMainNav(), getCustomCss(), getHeaderSettings(), getThemePalette(), getSiteFavicon()])
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
        {/* Mobile theme — fundamentally different mobile experience */}
        <link rel="stylesheet" href="/mobile-theme.css" />
        {/* PWA: Theme color for address bar */}
        <meta name="theme-color" content="#1e7a47" />
        {/* PWA: iOS standalone mode */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {/* Dynamic favicon from Theme settings — falls back to site-config.json if not set in DB */}
        <link rel="icon" type="image/png" href={favicon || siteConfig.favicon.shopifyUrl} />
        <link rel="shortcut icon" type="image/png" href={favicon || siteConfig.favicon.shopifyUrl} />
        {/* RSS autodiscovery */}
        <link rel="alternate" type="application/rss+xml" title="Home Atelier Journal" href="/feed.xml" />
        {/* Judge.me review widgets — add PUBLIC_TOKEN from judge.me dashboard → Settings → API */}
        <Script id="judge-me-config" strategy="beforeInteractive">
          {`window.jdgm = window.jdgm || {}; window.jdgm.SHOP_DOMAIN = 'homeu-ph.myshopify.com'; window.jdgm.PUBLIC_TOKEN = '';`}
        </Script>
        <Script src="https://cdn.judge.me/widget.js" strategy="afterInteractive" />
        {/* Admin-editable header appearance (Theme → Header) */}
        {headerFontQuery ? <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${headerFontQuery}&display=swap`} /> : null}
        <style id="homeu-header-css" dangerouslySetInnerHTML={{ __html: headerCss }} />
        {/* Theme palette CSS custom properties (Theme → Palette) */}
        <style id="homeu-palette-css" dangerouslySetInnerHTML={{ __html: paletteCss }} />
        {/* Admin-editable custom CSS (Theme → Custom CSS) */}
        {customCss ? <style id="homeu-custom-css" dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
      </head>
      <body>
        <PageViewTracker />
        <LiveVisitorTracker />
        <ServiceWorkerRegister />
        <SiteHeader nav={mainNav} header={header} logoUrl={header.logoUrl || undefined} />
        <main id="MainContent" className="content-for-layout" role="main" tabIndex={-1}>
          <MobileHomepageEnhancer />
          {children}
        </main>
        <SiteFooter />
        <MobileBottomNav />
        <MobileDrawer />
        <ChatWidget />
        <WebVitalsTracker />
        <InstallPrompt />
      </body>
    </html>
  )
}
