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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
    fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f7f9f6', color: '#151a17',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e3e8e0', borderRadius: 16,
    padding: 40, maxWidth: 440, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '70vh', padding: '40px 20px', background: '#faf9f6',
    }}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: '#151a17',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 16,
          }}>🔐</div>
          <h1 style={{
            fontFamily: "'Crimson Text', Georgia, serif", fontSize: 28, fontWeight: 400,
            margin: '0 0 6px', color: '#151a17',
          }}>Reset Password</h1>
          <p style={{ fontSize: 14, color: '#667168', margin: 0 }}>
            {token ? 'Choose a new password for your account.' : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {token ? (
          // Step 2: token in URL → set new password
          status === 'done' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: '#151a17' }}>Password Changed!</h2>
              <p style={{ fontSize: 14, color: '#667168', margin: '0 0 24px' }}>Your password has been updated successfully.</p>
              <Link href="/login" style={{
                display: 'inline-block', padding: '12px 28px', background: '#151a17', color: '#fff',
                borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}>
                Log In with New Password
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>
                  New Password
                </label>
                <input
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  required minLength={8} placeholder="At least 8 characters"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#151a17'}
                  onBlur={e => e.target.style.borderColor = '#d9e0d7'}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>
                  Confirm Password
                </label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                  placeholder="Re-enter your new password"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#151a17'}
                  onBlur={e => e.target.style.borderColor = '#d9e0d7'}
                />
              </div>
              {status === 'error' && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 13, border: '1px solid #fecaca' }}>
                  {message}
                </div>
              )}
              <button type="submit" disabled={status === 'loading'} style={{
                padding: '14px 28px', background: '#151a17', color: '#fff', border: 'none',
                borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1, transition: 'opacity 0.15s',
              }}>
                {status === 'loading' ? 'Saving…' : 'Set New Password'}
              </button>
            </form>
          )
        ) : (
          // Step 1: no token → request reset email
          status === 'sent' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: '#151a17' }}>Check Your Email</h2>
              <p style={{ fontSize: 14, color: '#667168', margin: '0 0 8px', lineHeight: 1.6 }}>
                If an account exists for <strong style={{ color: '#151a17' }}>{email}</strong>, we've sent a password reset link.
              </p>
              <p style={{ fontSize: 13, color: '#9aa69c', margin: '0 0 24px' }}>The link expires in 1 hour.</p>
              <Link href="/login" style={{
                display: 'inline-block', padding: '12px 28px', background: '#f5f5f5', color: '#151a17',
                borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid #d9e0d7',
              }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>
                  Email Address
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoFocus placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#151a17'}
                  onBlur={e => e.target.style.borderColor = '#d9e0d7'}
                />
              </div>
              {status === 'error' && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 13, border: '1px solid #fecaca' }}>
                  {message}
                </div>
              )}
              <button type="submit" disabled={status === 'loading'} style={{
                padding: '14px 28px', background: '#151a17', color: '#fff', border: 'none',
                borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1, transition: 'opacity 0.15s',
              }}>
                {status === 'loading' ? 'Sending…' : 'Send Reset Link'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 13, margin: '8px 0 0' }}>
                <Link href="/login" style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 500 }}>
                  ← Back to Login
                </Link>
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
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '40px 20px', background: '#faf9f6' }}>
        <div style={{ textAlign: 'center', color: '#667168' }}>Loading…</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
