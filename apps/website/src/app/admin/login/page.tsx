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
              width="260"
              height="60"
              viewBox="0 0 260 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* D icon */}
              <rect x="4" y="6" width="42" height="42" rx="8" fill="currentColor" opacity="0.15" />
              <text x="15" y="36" fontFamily="'Playfair Display', Georgia, serif" fontSize="28" fontWeight="800" fill="currentColor">D</text>
              {/* Diamond accent */}
              <path d="M52 27l4-4 4 4-4 4z" fill="currentColor" opacity="0.8" />
              {/* Text */}
              <text x="66" y="38" fontFamily="'Playfair Display', Georgia, serif" fontSize="28" fontWeight="700" fill="currentColor" letterSpacing="0">DaVinci</text>
              <text x="66" y="52" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" fill="currentColor" opacity="0.6" letterSpacing="4" textLength="130">COMMAND CENTER</text>
            </svg>
          </div>

          {/* Brand message */}
          <div className="admin-login-brand-message">
            <p>DaVinciOS Command Center</p>
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
