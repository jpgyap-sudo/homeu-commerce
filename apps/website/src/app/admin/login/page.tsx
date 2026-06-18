import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LoginForm } from './LoginForm'

export default async function AdminLoginPage() {
  const session = await getSession()
  if (session) {
    redirect('/admin/dashboard')
  }

  return (
    <div className="admin-login-shell">
      {/* Left panel: Brand showcase */}
      <div className="admin-login-brand-panel">
        <div className="admin-login-brand-panel-inner">
          {/* Decorative pattern overlay */}
          <div className="admin-login-brand-pattern" aria-hidden="true" />

          {/* DaVinciOS Logo */}
          <div className="admin-login-brand-header">
            <svg
              className="admin-login-brand-logo"
              width="196"
              height="44"
              viewBox="0 0 196 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* DaVinciOS D with geometric diamond accent */}
              <g transform="translate(4, 6)">
                {/* Stylized D with diamond accent */}
                <path
                  d="M8 32V2h8.5c6.5 0 11.5 2.5 13.5 7s2 9.5 0 14c-2 4.5-7 7-13.5 7H8zM14 6.5v23h2.5c4 0 7-1.5 8.5-5s1.5-6.5 0-10c-1.5-3.5-4.5-5-8.5-5H14z"
                  fill="currentColor"
                />
                {/* Diamond accent */}
                <path
                  d="M44 17l6-6 6 6-6 6-6-6z"
                  fill="currentColor"
                  opacity="0.6"
                />
                {/* a */}
                <path
                  d="M62 26c-2 2.5-5 4-9 4-5 0-8.5-2.5-8.5-7.5S48 15 53 15c3 0 5.5 1 7.5 3l-3 3c-1.5-1.5-3-2-4.5-2-2 0-3.5 1-3.5 3.5s1.5 3.5 3.5 3.5c1.5 0 3-1 4-2.5l3 2z"
                  fill="currentColor"
                />
                {/* v */}
                <path
                  d="M89 15l-5 16h-3.5l-4.5-10-4.5 10H68l-5-16h3.5l3 11 4.5-11h3l4.5 11 3-11H89z"
                  fill="currentColor"
                />
                {/* i */}
                <circle cx="96" cy="11" r="1.5" fill="currentColor" />
                <rect x="94.5" y="15" width="3" height="16" rx="1.5" fill="currentColor" />
                {/* n */}
                <path
                  d="M102 31V15h3v2.5c1-1.5 2.5-3 5-3 3 0 5 2 5 6v10.5h-3V21c0-2-1-3.5-3-3.5s-3 1-3.5 3V31h-3.5z"
                  fill="currentColor"
                />
                {/* c */}
                <path
                  d="M138.5 21.5c0 3.5 2 6 6 6 2 0 4-1 5.5-3l2.5 2c-2 2.5-5 4-8 4-5 0-9-3-9-8.5s4-8.5 9-8.5c3 0 5.5 1 7.5 3.5l-2.5 2c-1.5-1.5-3-2.5-5-2.5-3.5 0-6 2-6 5z"
                  fill="currentColor"
                />
                {/* i2 */}
                <circle cx="157" cy="11" r="1.5" fill="currentColor" />
                <rect x="155.5" y="15" width="3" height="16" rx="1.5" fill="currentColor" />
                {/* s */}
                <path
                  d="M168 28c1.5 1.5 3 2 5 2s3-.5 3-2c0-2-3-2.5-5-3-2.5-.5-5-1-5-4.5s2.5-5 6-5c2 0 4 .5 5.5 1.5l-1.5 2.5c-1.5-1-3-1.5-4.5-1.5-1.5 0-2.5.5-2.5 2s2.5 2 5 2.5c3 .5 5.5 1.5 5.5 4.5s-2.5 5-6.5 5c-2 0-4.5-.5-6-2l1.5-2.5z"
                  fill="currentColor"
                />
              </g>
              {/* Tagline */}
              <text
                x="4"
                y="40"
                fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
                fontSize="10"
                fontWeight="700"
                letterSpacing="4.5"
                fill="currentColor"
                opacity="0.5"
              >
                OPERATIONS CONSOLE
              </text>
            </svg>
          </div>

          {/* Brand message */}
          <div className="admin-login-brand-message">
            <h2>Welcome back</h2>
            <p>
              Sign in to manage your HomeU catalog, process RFQs,
              generate quotations, and oversee your operations.
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
            <svg
              width="140"
              height="32"
              viewBox="0 0 140 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <text x="0" y="24" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="800" fill="currentColor">HomeU</text>
              <text x="0" y="32" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" letterSpacing="3.5" fill="currentColor" opacity="0.5">COMMAND</text>
            </svg>
          </div>

          <div className="admin-login-card">
            <h1 className="admin-login-title">Sign in</h1>
            <p className="admin-login-subtitle">Enter your credentials to access the console</p>
            <LoginForm />
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
