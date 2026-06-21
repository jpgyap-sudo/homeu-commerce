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

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || googleInitialized.current) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true; script.defer = true
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Authentication failed')
      router.push('/customer/dashboard'); router.refresh()
    } catch (err: any) { setError(err.message || 'Google sign-in failed') }
    finally { setGoogleLoading(false) }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.errors?.[0]?.message || 'Login failed')
      }
      router.push('/customer/dashboard'); router.refresh()
    } catch (err: any) { setError(err.message || 'Invalid email or password') }
    finally { setLoading(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
    fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f7f9f6', color: '#151a17',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#faf9f6' }}>
      {/* Left brand panel */}
      <div style={{
        flex: '0 0 400px', background: 'linear-gradient(135deg, #151a17 0%, #2a3228 50%, #1a2620 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: 48, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, background: 'radial-gradient(circle at 30% 50%, #fff 0%, transparent 60%), radial-gradient(circle at 70% 80%, #b88935 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏡</div>
          <h1 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 36, fontWeight: 400, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Home Atelier</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, maxWidth: 280 }}>
            Curated furniture for the modern Filipino home. Made-to-order, crafted with care.
          </p>
          <div style={{ marginTop: 32, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#b88935' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ maxWidth: 400, width: '100%' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 28, fontWeight: 400, color: '#151a17', margin: '0 0 6px' }}>Welcome back</h2>
            <p style={{ fontSize: 14, color: '#667168', margin: 0 }}>
              Sign in to view prices and track your quotation requests.
            </p>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 500, border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>
                Email Address
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                style={inputStyle} onFocus={e => e.target.style.borderColor = '#151a17'} onBlur={e => e.target.style.borderColor = '#d9e0d7'} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Password
                </label>
                <Link href="/customer/reset-password" style={{ fontSize: 12, color: '#1a6d3e', fontWeight: 500, textDecoration: 'none' }}>
                  Forgot?
                </Link>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password"
                style={inputStyle} onFocus={e => e.target.style.borderColor = '#151a17'} onBlur={e => e.target.style.borderColor = '#d9e0d7'} />
            </div>
            <button type="submit" disabled={loading} style={{
              padding: '14px 28px', background: '#151a17', color: '#fff', border: 'none',
              borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s', marginTop: 4,
            }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#e3e8e0' }} />
                <span style={{ fontSize: 11, color: '#9aa69c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>or</span>
                <div style={{ flex: 1, height: 1, background: '#e3e8e0' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div ref={googleButtonRef} />
              </div>
              {googleLoading && <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: '#667168' }}>Signing in with Google…</div>}
            </>
          )}

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#667168' }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ color: '#1a6d3e', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
          </p>
          <p style={{ marginTop: 12, textAlign: 'center' }}>
            <Link href="/products" style={{ color: '#9aa69c', fontSize: 13, textDecoration: 'none' }}>
              &larr; Browse Products
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
