'use client'

/**
 * Non-blocking Google Fonts load for the admin panel (preload via
 * media="print", then swap to media="all" once loaded — avoids blocking
 * First Paint on the font request). The onLoad handler requires a Client
 * Component; it cannot live inline in admin/layout.tsx (a Server Component).
 */
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500&family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,300;1,14..32,400&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap'

export default function AdminFontPreload() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href={FONT_HREF}
        media="print"
        onLoad={(e) => { (e.currentTarget as HTMLLinkElement).media = 'all' }}
      />
      <noscript>
        <link rel="stylesheet" href={FONT_HREF} />
      </noscript>
    </>
  )
}
