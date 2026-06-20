'use client'

import { useState, FormEvent, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const googleInitialized = useRef(false)

  // Initialize Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || googleInitialized.current) return

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      googleInitialized.current = true
      if (window.google?.accounts?.id && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          cancel_on_tap_outside: false,
        })
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard', shape: 'pill', theme: 'outline',
          text: 'signin_with', size: 'large', width: 320,
        })
      }
    }
    document.head.appendChild(script)
    return () => { if (window.google?.accounts?.id) window.google.accounts.id.cancel() }
  }, [])

  async function handleGoogleCredential(response: { credential: string }) {
    if (!response?.credential) { setError('Google sign-in failed'); return }
    setGoogleLoading(true); setError('')
    try {
      const res = await fetch('/api/customers/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Authentication failed')
      router.push('/customer/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed')
    } finally { setGoogleLoading(false) }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.errors?.[0]?.message || 'Login failed')
      }
      router.push('/customer/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: 8 }}>Customer Login</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>
        Log in to view product prices and track your quotation requests.
      </p>

      {error && (
        <div style={{ background: '#fee', color: '#c00', padding: '12px 16px', borderRadius: 6, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Email Address</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 16, boxSizing: 'border-box' }}
            placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Password</label>
          <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 16, boxSizing: 'border-box' }}
            placeholder="Enter your password" />
        </div>
        <button type="submit" disabled={loading}
          style={{ padding: '12px 24px', background: loading ? '#999' : '#222', color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8 }}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      {/* Google sign-in */}
      {GOOGLE_CLIENT_ID && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 14px' }}>
            <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
            <span style={{ fontSize: 12, color: '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div ref={googleButtonRef} />
          </div>
          {googleLoading && <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: '#666' }}>Signing in with Google...</div>}
        </>
      )}

      <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#666' }}>
        Don't have an account?{' '}
        <Link href="/register" style={{ color: '#222', fontWeight: 600, textDecoration: 'underline' }}>Register here</Link>
      </p>
      <p style={{ marginTop: 12, textAlign: 'center' }}>
        <Link href="/" style={{ color: '#666', fontSize: 14 }}>&larr; Back to Home</Link>
      </p>
    </main>
  )
}
