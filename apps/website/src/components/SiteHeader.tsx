'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import navigation from '@/data/navigation.json'
import siteConfig from '@/data/site-config.json'

type NavItem = {
  title: string
  href: string
  type: string
  children: NavItem[]
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  return (
    <div data-section-type="header-section">
      <header className="site-header logo--center" role="banner">

        {/* ── Desktop nav ── */}
        <div className="grid grid--no-gutters grid--table site-header__desktop-nav medium-up--hide-nav">
          {/* Logo — center aligned */}
          <div className="grid__item site-header__logo text-center">
            <Link href="/" className="site-header__logo-link">
              <Image
                src={siteConfig.logo.shopifyUrl}
                alt={siteConfig.name}
                width={siteConfig.logo.maxWidth}
                height={60}
                className="site-header__logo-image"
                priority
                unoptimized
              />
            </Link>
          </div>
        </div>

        {/* ── Header icons (desktop) ── */}
        <div className="site-header__icons small--hide">
          <Link href="/search" className="site-header__icon-btn" aria-label="Search">
            <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-4-4"/></svg>
          </Link>
          <Link href="/customer/dashboard" className="site-header__icon-btn" aria-label="Account">
            <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="6" r="3.5"/><path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7"/></svg>
          </Link>
        </div>

        {/* ── Main nav (desktop) ── */}
        <nav className="site-nav small--hide" id="SiteNav" aria-label="Main navigation">
          <ul className="site-nav__linklist navlinks" role="list">
            {(navigation.main as NavItem[]).map((item) => (
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
                  <ul
                    className={`site-nav__dropdown${openDropdown === item.title ? ' site-nav__dropdown--open' : ''}`}
                    role="list"
                  >
                    {item.children.map((child) => (
                      <li key={child.href + child.title} className="site-nav__dropdown-item">
                        <Link href={child.href} className="site-nav__dropdown-link">
                          {child.title}
                        </Link>
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
            <button
              type="button"
              className="btn btn--link site-header__icon-button site-header__menu-toggle__open"
              aria-controls="MobileNav"
              aria-expanded={mobileOpen ? 'true' : 'false'}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              <span className="icon-bar" />
              <span className="icon-bar" />
              <span className="icon-bar" />
            </button>
          </div>

          <div className="grid__item text-center site-header__mobile-logo">
            <Link href="/">
              <Image
                src={siteConfig.logo.shopifyUrl}
                alt={siteConfig.name}
                width={140}
                height={44}
                className="site-header__logo-image"
                unoptimized
              />
            </Link>
          </div>

          <div className="grid__item site-header__icon site-header__mobile-icons">
            <Link href="/search" className="site-header__icon-btn" aria-label="Search">
              <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-4-4"/></svg>
            </Link>
            <Link href="/customer/dashboard" className="site-header__icon-btn" aria-label="Account">
              <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="6" r="3.5"/><path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7"/></svg>
            </Link>
          </div>
        </div>

        {/* ── Mobile nav drawer ── */}
        {mobileOpen && (
          <nav id="MobileNav" className="mobile-nav-wrapper" aria-label="Mobile navigation">
            <ul className="mobile-nav" role="list">
              {(navigation.main as NavItem[]).map((item) => (
                <li key={item.title} className="mobile-nav__item">
                  <div className="mobile-nav__link-wrapper">
                    <Link
                      href={item.href}
                      className="mobile-nav__link"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.title}
                    </Link>
                  </div>
                  {item.children.length > 0 && (
                    <ul className="mobile-nav__dropdown" role="list">
                      {item.children.map((child) => (
                        <li key={child.title} className="mobile-nav__item mobile-nav__item--level-2">
                          <Link
                            href={child.href}
                            className="mobile-nav__link mobile-nav__link--level-2"
                            onClick={() => setMobileOpen(false)}
                          >
                            {child.title}
                          </Link>
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
