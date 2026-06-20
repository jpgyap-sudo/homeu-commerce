'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import navigation from '@/data/navigation.json'
import siteConfig from '@/data/site-config.json'
import { QuoteCartBadge } from '@/components/QuoteCart'

type NavItem = { title: string; href: string; type?: string; children: NavItem[] }

interface HeaderSettings {
  logoUrl: string; logoMaxWidth: number; bgColor: string; textColor: string
  sticky: boolean; fontFamily: string; navFontSize: number
  iconsPosition: 'right' | 'left' | 'top-bar'
  layout: 'logo-center' | 'logo-left'
  announcement: { enabled: boolean; text: string; link: string; bgColor: string; textColor: string }
}

export function SiteHeader({ nav, logoUrl, header }: { nav?: NavItem[]; logoUrl?: string; header?: HeaderSettings }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const navItems: NavItem[] = nav && nav.length > 0 ? nav : (navigation.main as NavItem[])
  const logoSrc = logoUrl || siteConfig.logo.shopifyUrl
  const hs = header || { layout: 'logo-center', iconsPosition: 'right', announcement: { enabled: false } } as HeaderSettings
  const announcement = hs.announcement?.enabled ? hs.announcement : null

  const Icons = () => (
    <>
      <Link href="/search" className="site-header__icon-btn" aria-label="Search">
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-4-4"/></svg>
      </Link>
      <Link href="/customer/dashboard" className="site-header__icon-btn site-header__login-btn" aria-label="Log in">
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="6" r="3.5"/><path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7"/></svg>
        <span className="site-header__login-label">Log in</span>
      </Link>
      <QuoteCartBadge />
    </>
  )

  return (
    <div data-section-type="header-section">
      {/* Announcement bar */}
      {announcement && (
        <div className="homeu-announcement-bar">
          {announcement.link
            ? <a href={announcement.link} style={{ color: 'inherit', textDecoration: 'none' }}>{announcement.text}</a>
            : <span>{announcement.text}</span>}
        </div>
      )}

      <header className={`site-header ${hs.layout === 'logo-left' ? 'logo--left' : 'logo--center'}`} role="banner">

        {/* Top utility bar (icons separated above nav) */}
        {hs.iconsPosition === 'top-bar' && (
          <div className="site-header__top-bar small--hide" style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', gap: 12 }}>
            <Icons />
          </div>
        )}

        {/* ── Desktop nav ── */}
        <div className="grid grid--no-gutters grid--table site-header__desktop-nav medium-up--hide-nav">
          {hs.iconsPosition === 'left' && (
            <div className="grid__item site-header__icon small--hide" style={{ display: 'flex', gap: 12 }}>
              <Icons />
            </div>
          )}
          {/* Logo */}
          <div className={`grid__item site-header__logo ${hs.layout === 'logo-left' ? 'text-left' : 'text-center'}`}>
            <Link href="/" className="site-header__logo-link">
              <span className="site-header__logo-anim">
                <Image
                  src={logoSrc}
                  alt={siteConfig.name}
                  width={hs.layout === 'logo-left' ? Math.min(hs.logoMaxWidth || 200, 200) : siteConfig.logo.maxWidth}
                  height={60}
                  className="site-header__logo-image"
                  priority
                  unoptimized
                />
                <span
                  className="site-header__logo-anim-color"
                  style={{ WebkitMaskImage: `url(${logoSrc})`, maskImage: `url(${logoSrc})` }}
                  aria-hidden="true"
                />
              </span>
            </Link>
          </div>
          {hs.iconsPosition === 'right' && (
            <div className="grid__item site-header__icon small--hide" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Icons />
            </div>
          )}
        </div>

        {/* ── Main nav (desktop) ── */}
        <nav className="site-nav small--hide" id="SiteNav" aria-label="Main navigation">
          <ul className="site-nav__linklist navlinks" role="list">
            {navItems.map((item) => (
              <li
                key={item.href + item.title}
                className={`site-nav__item${item.children.length > 0 ? ' site-nav__item--has-dropdown' : ''}`}
                onMouseEnter={() => item.children.length > 0 && setOpenDropdown(item.title)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link
                  href={item.href}
                  className="site-nav__link site-nav__link--main"
                  aria-haspopup={item.children.length > 0 ? 'true' : undefined}
                  aria-expanded={openDropdown === item.title ? 'true' : 'false'}
                >
                  {item.title}
                  {item.children.length > 0 && (
                    <span className="site-nav__arrow" aria-hidden="true">&#9662;</span>
                  )}
                </Link>
                {item.children.length > 0 && (
                  <ul className={`site-nav__dropdown${openDropdown === item.title ? ' site-nav__dropdown--open' : ''}`} role="list">
                    {item.children.map((child) => (
                      <li key={child.href + child.title} className="site-nav__dropdown-item">
                        <Link href={child.href} className="site-nav__dropdown-link">{child.title}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Mobile header bar ── */}
        <div className="grid grid--no-gutters grid--table site-header__mobile-nav medium-up--hide">
          <div className="grid__item site-header__icon site-header__menu">
            <button type="button" className="btn btn--link site-header__icon-button site-header__menu-toggle__open"
              aria-controls="MobileNav" aria-expanded={mobileOpen ? 'true' : 'false'}
              onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
              <span className="icon-bar" /><span className="icon-bar" /><span className="icon-bar" />
            </button>
          </div>
          <div className="grid__item text-center site-header__mobile-logo">
            <Link href="/">
              <span className="site-header__logo-anim">
                <Image src={logoSrc} alt={siteConfig.name} width={140} height={44} className="site-header__logo-image" unoptimized />
                <span
                  className="site-header__logo-anim-color"
                  style={{ WebkitMaskImage: `url(${logoSrc})`, maskImage: `url(${logoSrc})` }}
                  aria-hidden="true"
                />
              </span>
            </Link>
          </div>
          <div className="grid__item site-header__icon site-header__mobile-icons">
            <Icons />
          </div>
        </div>

        {/* ── Mobile nav drawer ── */}
        {mobileOpen && (
          <nav id="MobileNav" className="mobile-nav-wrapper" aria-label="Mobile navigation">
            <ul className="mobile-nav" role="list">
              {navItems.map((item) => (
                <li key={item.title} className="mobile-nav__item">
                  <div className="mobile-nav__link-wrapper">
                    <Link href={item.href} className="mobile-nav__link" onClick={() => setMobileOpen(false)}>{item.title}</Link>
                  </div>
                  {item.children.length > 0 && (
                    <ul className="mobile-nav__dropdown" role="list">
                      {item.children.map((child) => (
                        <li key={child.title} className="mobile-nav__item mobile-nav__item--level-2">
                          <Link href={child.href} className="mobile-nav__link mobile-nav__link--level-2" onClick={() => setMobileOpen(false)}>{child.title}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
    </div>
  )
}
