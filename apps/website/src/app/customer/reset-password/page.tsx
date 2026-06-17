'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  // Step 1 — request reset link
  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/customers/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setStatus('sent')
    } catch (err: any) {
      setMessage(err.message)
      setStatus('error')
    }
  }

  // Step 2 — set new password using token
  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirm) { setMessage('Passwords do not match'); setStatus('error'); return }
    if (newPassword.length < 8) { setMessage('Password must be at least 8 characters'); setStatus('error'); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/customers/reset-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed')
      setStatus('done')
    } catch (err: any) {
      setMessage(err.message)
      setStatus('error')
    }
  }

  return (
    <div className="auth-page page-width">
      <div className="auth-box">
        <h1 className="auth-title">Reset Password</h1>

        {token ? (
          // Step 2: token in URL → set new password
          status === 'done' ? (
            <div className="auth-success">
              <p>Password changed successfully.</p>
              <Link href="/login" className="btn btn--primary">Log In</Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="auth-form">
              <p className="auth-sub">Enter your new password below.</p>
              <div className="auth-form__field">
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
              </div>
              <div className="auth-form__field">
                <label>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              {status === 'error' && <p className="auth-error">{message}</p>}
              <button type="submit" className="btn btn--primary auth-submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Saving…' : 'Set New Password'}
              </button>
            </form>
          )
        ) : (
          // Step 1: no token → request reset email
          status === 'sent' ? (
            <div className="auth-success">
              <p>If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.</p>
              <Link href="/login" className="btn btn--secondary">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleRequest} className="auth-form">
              <p className="auth-sub">Enter your account email and we&apos;ll send you a reset link.</p>
              <div className="auth-form__field">
                <label>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              {status === 'error' && <p className="auth-error">{message}</p>}
              <button type="submit" className="btn btn--primary auth-submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending…' : 'Send Reset Link'}
              </button>
              <p className="auth-footer">
                <Link href="/login">Back to Login</Link>
              </p>
            </form>
          )
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-page page-width"><div className="auth-box"><p>Loading…</p></div></div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
