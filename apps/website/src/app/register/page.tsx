'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.errors?.[0]?.message || 'Registration failed')
      }
      const loginRes = await fetch('/api/customers/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!loginRes.ok) { router.push('/login'); return }
      router.push('/customer/dashboard'); router.refresh()
    } catch (err: any) { setError(err.message || 'Registration failed') }
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
          <h1 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 36, fontWeight: 400, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Join Home Atelier</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, maxWidth: 280 }}>
            Create an account to save your favorite pieces, get pricing, and submit quotation requests.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ maxWidth: 400, width: '100%' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 28, fontWeight: 400, color: '#151a17', margin: '0 0 6px' }}>Create account</h2>
            <p style={{ fontSize: 14, color: '#667168', margin: 0 }}>Get started with your Home Atelier account.</p>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 500, border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Juan Dela Cruz"
                style={inputStyle} onFocus={e => e.target.style.borderColor = '#151a17'} onBlur={e => e.target.style.borderColor = '#d9e0d7'} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                style={inputStyle} onFocus={e => e.target.style.borderColor = '#151a17'} onBlur={e => e.target.style.borderColor = '#d9e0d7'} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>Phone Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+63 912 345 6789"
                style={inputStyle} onFocus={e => e.target.style.borderColor = '#151a17'} onBlur={e => e.target.style.borderColor = '#d9e0d7'} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters"
                style={inputStyle} onFocus={e => e.target.style.borderColor = '#151a17'} onBlur={e => e.target.style.borderColor = '#d9e0d7'} />
            </div>
            <button type="submit" disabled={loading} style={{
              padding: '14px 28px', background: '#151a17', color: '#fff', border: 'none',
              borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s', marginTop: 4,
            }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#667168' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#1a6d3e', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
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
