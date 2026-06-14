'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

      // Redirect to customer dashboard on success
      router.push('/customer/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
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
          <label htmlFor="email" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 16, boxSizing: 'border-box' }}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 16, boxSizing: 'border-box' }}
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: loading ? '#999' : '#222',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: 8,
          }}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#666' }}>
        Don't have an account?{' '}
        <Link href="/register" style={{ color: '#222', fontWeight: 600, textDecoration: 'underline' }}>
          Register here
        </Link>
      </p>

      <p style={{ marginTop: 12, textAlign: 'center' }}>
        <Link href="/" style={{ color: '#666', fontSize: 14 }}>
          &larr; Back to Home
        </Link>
      </p>
    </main>
  )
}
