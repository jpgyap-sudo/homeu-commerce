'use client'

import { useState } from 'react'
import Link from 'next/link'
import navigation from '@/data/navigation.json'
import siteConfig from '@/data/site-config.json'

export function SiteFooter() {
  const year = new Date().getFullYear()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleNewsletter(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'success' : 'error')
      if (res.ok) setEmail('')
    } catch { setStatus('error') }
  }

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer__inner page-width">

        {/* Brand */}
        <div className="site-footer__col site-footer__col--brand">
          <h3 className="site-footer__title">{siteConfig.name}</h3>
          <p className="site-footer__tagline">{siteConfig.tagline}</p>
          <address className="site-footer__address">
            <p>{siteConfig.address.address1}</p>
            <p>{siteConfig.address.city}, {siteConfig.address.country}</p>
            <p><a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></p>
            <p><a href={`tel:${siteConfig.phone}`}>{siteConfig.phone}</a></p>
          </address>
          <p className="site-footer__hours">
            {siteConfig.shopHours.weekdays}<br />
            Sunday: {siteConfig.shopHours.sunday}
          </p>
        </div>

        {/* Quick Links */}
        <div className="site-footer__col">
          <h3 className="site-footer__title">Quick Links</h3>
          <ul className="site-footer__linklist" role="list">
            {navigation.footer.slice(0, 7).map((item) => (
              <li key={item.title} className="site-footer__linklist-item">
                <Link href={item.href} className="site-footer__link">{item.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Information */}
        <div className="site-footer__col">
          <h3 className="site-footer__title">Information</h3>
          <ul className="site-footer__linklist" role="list">
            {navigation.footer.slice(7).map((item) => (
              <li key={item.title} className="site-footer__linklist-item">
                <Link href={item.href} className="site-footer__link">{item.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Connect: newsletter + social */}
        <div className="site-footer__col site-footer__col--connect">
          <h3 className="site-footer__title">Stay Inspired</h3>
          <p className="site-footer__newsletter-sub">Get design tips and new arrivals in your inbox.</p>
          {status === 'success' ? (
            <p className="site-footer__newsletter-success">Thanks for subscribing!</p>
          ) : (
            <form onSubmit={handleNewsletter} className="site-footer__newsletter-form">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="site-footer__newsletter-input"
              />
              <button type="submit" className="site-footer__newsletter-btn" disabled={status === 'loading'}>
                {status === 'loading' ? '…' : 'Subscribe'}
              </button>
              {status === 'error' && (
                <p className="site-footer__newsletter-error">Something went wrong. Try again.</p>
              )}
            </form>
          )}

          <h3 className="site-footer__title site-footer__title--social">Follow Us</h3>
          <ul className="social-icons" role="list">
              {siteConfig.social.instagram && (
                <li>
                  <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" className="icon-fallback-text" aria-label="Instagram">
                    <span className="icon icon--instagram" aria-hidden="true">
                      <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M10 1.8c2.67 0 2.99.01 4.04.06 2.76.13 4.04 1.41 4.17 4.17.05 1.05.06 1.36.06 4.04s-.01 2.99-.06 4.04c-.13 2.75-1.41 4.04-4.17 4.17-1.05.05-1.35.06-4.04.06s-2.99-.01-4.04-.06C3.2 18.16 1.92 16.88 1.79 14.12 1.74 13.07 1.73 12.76 1.73 10s.01-2.99.06-4.04C1.92 3.2 3.2 1.92 5.96 1.79 7.01 1.74 7.32 1.73 10 1.73zM10 0C7.28 0 6.94.01 5.88.06 2.25.23.23 2.25.06 5.88.01 6.94 0 7.28 0 10s.01 3.06.06 4.12c.17 3.63 2.19 5.65 5.82 5.82C6.94 19.99 7.28 20 10 20s3.06-.01 4.12-.06c3.63-.17 5.65-2.19 5.82-5.82.05-1.06.06-1.4.06-4.12s-.01-3.06-.06-4.12C19.77 2.25 17.75.23 14.12.06 13.06.01 12.72 0 10 0zm0 4.86a5.14 5.14 0 100 10.28A5.14 5.14 0 0010 4.86zm0 8.48a3.34 3.34 0 110-6.68 3.34 3.34 0 010 6.68zm5.34-9.78a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"/></svg>
                    </span>
                    Instagram
                  </a>
                </li>
              )}
              {siteConfig.social.facebook && (
                <li>
                  <a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer" className="icon-fallback-text" aria-label="Facebook">
                    <span className="icon icon--facebook" aria-hidden="true">
                      <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M18.05.811A1.03 1.03 0 0017.1 0H2.9A1.03 1.03 0 001.95.811 1.004 1.004 0 001.137 1.75v16.5c0 .347.14.68.386.926.247.245.58.383.927.383h8.8v-7.334H8.967V9.167h2.283V6.542c0-2.557 1.496-4.035 3.75-4.035.76 0 1.52.037 2.25.11v2.648h-1.58c-1.163 0-1.38.587-1.38 1.434V9.17h2.82l-.38 3.058H14.29V19.56h3.812a1.295 1.295 0 001.313-1.31V1.75A1.006 1.006 0 0018.05.81z"/></svg>
                    </span>
                    Facebook
                  </a>
                </li>
              )}
              {siteConfig.social.pinterest && (
                <li>
                  <a href={siteConfig.social.pinterest} target="_blank" rel="noopener noreferrer" className="icon-fallback-text" aria-label="Pinterest">
                    <span className="icon icon--pinterest" aria-hidden="true">
                      <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M10 0C4.478 0 0 4.477 0 10a9.99 9.99 0 006.88 9.52c-.094-.9-.18-2.286.038-3.27.197-.89 1.318-5.585 1.318-5.585s-.337-.673-.337-1.668c0-1.56.908-2.727 2.036-2.727.96 0 1.425.72 1.425 1.583 0 .963-.617 2.405-.934 3.744-.265 1.12.56 2.03 1.66 2.03 1.99 0 3.522-2.097 3.522-5.123 0-2.68-1.924-4.554-4.673-4.554-3.183 0-5.05 2.387-5.05 4.855 0 .96.37 1.99.833 2.552.09.113.105.21.077.323l-.31 1.256c-.05.203-.167.247-.384.148-1.396-.65-2.27-2.694-2.27-4.334 0-3.524 2.56-6.762 7.384-6.762 3.877 0 6.89 2.763 6.89 6.455 0 3.85-2.427 6.944-5.796 6.944-1.132 0-2.198-.588-2.562-1.282l-.698 2.6c-.252.97-.933 2.185-1.39 2.925.047.014.092.03.138.043A9.994 9.994 0 0010 20c5.523 0 10-4.477 10-10S15.523 0 10 0z"/></svg>
                    </span>
                    Pinterest
                  </a>
                </li>
              )}
              {siteConfig.social.youtube && (
                <li>
                  <a href={siteConfig.social.youtube} target="_blank" rel="noopener noreferrer" className="icon-fallback-text" aria-label="YouTube">
                    <span className="icon icon--youtube" aria-hidden="true">
                      <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M19.582 5.78a2.5 2.5 0 00-1.759-1.768C16.254 3.6 10 3.6 10 3.6s-6.254 0-7.823.412A2.5 2.5 0 00.418 5.78C0 7.356 0 10.63 0 10.63s0 3.275.418 4.85a2.5 2.5 0 001.76 1.77C3.745 17.66 10 17.66 10 17.66s6.254 0 7.823-.41a2.5 2.5 0 001.76-1.77C20 13.905 20 10.63 20 10.63s0-3.274-.418-4.85zM8 13.6V7.66l5.23 2.97L8 13.6z"/></svg>
                    </span>
                    YouTube
                  </a>
                </li>
              )}
            </ul>
          </div>
      </div>

      {/* Bottom bar */}
      <div className="site-footer__copyright page-width">
        <p>
          &copy; {year} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
