'use client'

import { useActionState, useState } from 'react'
import { loginAction } from './actions'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => {
      return loginAction(formData)
    },
    { error: '' }
  )

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <form action={formAction} className="admin-login-form">
      {/* Error alert */}
      {state?.error && (
        <div className="admin-login-error">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11.5" r="0.75" fill="currentColor"/>
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {/* Email field */}
      <div className="admin-login-field">
        <label htmlFor="email">Email address</label>
        <div className="admin-login-input-wrap">
          <svg className="admin-login-input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1.5" y="3.75" width="15" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M1.5 5.25l7.5 5.25 7.5-5.25" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {/* Password field */}
      <div className="admin-login-field">
        <div className="admin-login-label-row">
          <label htmlFor="password">Password</label>
          <a href="/admin/forgot" className="admin-login-forgot-link" tabIndex={-1}>
            Forgot?
          </a>
        </div>
        <div className="admin-login-input-wrap">
          <svg className="admin-login-input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="7.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5.25 7.5V5.25a3.75 3.75 0 017.5 0V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="admin-login-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 3.75c-4.5 0-7.5 3-7.5 5.25s3 5.25 7.5 5.25 7.5-3 7.5-5.25-3-5.25-7.5-5.25z" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2.25 2.25l13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M5.5 5.5A7.5 7.5 0 0015.75 9a7.5 7.5 0 00-2.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7.5 7.5a2.25 2.25 0 103 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Submit button */}
      <button type="submit" className="admin-login-submit" disabled={pending}>
        {pending ? (
          <span className="admin-login-submit-loading">
            <svg className="admin-login-spinner" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
              <path d="M10 2a8 8 0 018 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Signing in...
          </span>
        ) : (
          <span className="admin-login-submit-text">
            Sign in
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        )}
      </button>
    </form>
  )
}
