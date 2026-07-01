import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LoginForm } from './LoginForm'
import siteConfig from '@/data/site-config.json'

const BRAND_LOGO = 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/uploads/reviews/bdda42a44380cbd7858cdc620097aed8e17f7bd2d1837be245688e77c9942ba5.png'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string }>
}) {
  const session = await getSession()
  if (session) {
    redirect('/admin/dashboard')
  }
  const sp = searchParams ? await searchParams : {}
  const redirectTo = typeof sp.redirect === 'string' ? sp.redirect : ''

  return (
    <div className="admin-login-shell">
      {/* Left panel: Brand showcase */}
      <div className="admin-login-brand-panel">
        <div className="admin-login-brand-panel-inner">
          {/* Decorative pattern overlay */}
          <div className="admin-login-brand-pattern" aria-hidden="true" />

          {/* Brand logo (CDN) */}
          <div className="admin-login-brand-header">
            {BRAND_LOGO
              ? <img className="admin-login-brand-logo" src={BRAND_LOGO} alt="Home Atelier" />
              : <span className="admin-login-brand-wordmark">Home Atelier</span>}
            <span className="admin-login-brand-eyebrow">Operations Console</span>
          </div>

          {/* Brand message */}
          <div className="admin-login-brand-message">
            <h2>DaVinciOS</h2>
            <p className="admin-login-brand-desc">
              The operations engine powering HomeU.ph — manage your catalog,
              process RFQs, generate quotations, and run your furniture business.
            </p>
          </div>

          {/* Decorative divider line */}
          <div className="admin-login-brand-divider" />

          {/* Bottom decorative element */}
          <div className="admin-login-brand-footer">
            <span className="admin-login-brand-badge">SECURE LOGIN</span>
            <span className="admin-login-brand-version">v3.0</span>
          </div>
        </div>
      </div>

      {/* Right panel: Login form */}
      <div className="admin-login-form-panel">
        <div className="admin-login-form-panel-inner">
          <div className="admin-login-mobile-brand">
            {BRAND_LOGO
              ? <img className="admin-login-mobile-logo" src={BRAND_LOGO} alt="Home Atelier" />
              : <span className="admin-login-brand-wordmark">Home Atelier</span>}
          </div>

          <div className="admin-login-card">
            <h1 className="admin-login-title">Sign in</h1>
            <p className="admin-login-subtitle">Enter your credentials to access the console</p>
            <LoginForm redirectTo={redirectTo} />
          </div>

          <p className="admin-login-footer-text">
            Need help? Contact{' '}
            <a href="mailto:support@homeu.ph">support@homeu.ph</a>
          </p>
        </div>
      </div>
    </div>
  )
}
