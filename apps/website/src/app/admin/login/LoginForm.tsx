'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, { error: '' })

  return (
    <form action={formAction} className="admin-login-form">
      {state?.error && (
        <div className="admin-login-error">{state.error}</div>
      )}

      <div className="admin-login-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>

      <div className="admin-login-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>

      <button type="submit" className="admin-login-submit" disabled={pending}>
        {pending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
