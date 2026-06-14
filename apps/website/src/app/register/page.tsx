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
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Create the customer account
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.errors?.[0]?.message || 'Registration failed')
      }

      // 2. Auto-login after registration
      const loginRes = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!loginRes.ok) {
        // Account created but login failed — redirect to login
        router.push('/login?registered=true')
        return
      }

      // 3. Redirect to dashboard
      router.push('/customer/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: 8 }}>Create Your Account</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>
        Register to view product prices, submit RFQs, and track your quotations.
      </p>

      {error && (
        <div style={{ background: '#fee', color: '#c00', padding: '12px 16px', borderRadius: 6, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 16, boxSizing: 'border-box' }}
            placeholder="Juan Dela Cruz"
          />
        </div>

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
          <label htmlFor="phone" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
            Contact Number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 16, boxSizing: 'border-box' }}
            placeholder="+63 912 345 6789"
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
            minLength={6}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 16, boxSizing: 'border-box' }}
            placeholder="At least 6 characters"
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
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#666' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#222', fontWeight: 600, textDecoration: 'underline' }}>
          Log in
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
