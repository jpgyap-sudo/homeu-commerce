'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function ActivateContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'pending' | 'activating' | 'done' | 'error'>('pending')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return
    setStatus('activating')
    fetch('/api/customers/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Activation failed')
        setStatus('done')
        setTimeout(() => router.push('/login'), 2500)
      })
      .catch(err => {
        setMessage(err.message)
        setStatus('error')
      })
  }, [token, router])

  return (
    <div className="auth-page page-width">
      <div className="auth-box">
        <h1 className="auth-title">Activate Account</h1>

        {!token && (
          <div className="auth-success">
            <p>Check your email for an activation link. Click it to verify your account.</p>
            <Link href="/login" className="btn btn--secondary">Back to Login</Link>
          </div>
        )}

        {status === 'activating' && <p className="auth-sub">Activating your account…</p>}

        {status === 'done' && (
          <div className="auth-success">
            <p>Your account has been activated! Redirecting to login…</p>
            <Link href="/login" className="btn btn--primary">Log In Now</Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p className="auth-error">{message || 'This activation link is invalid or has expired.'}</p>
            <p className="auth-footer">
              Need help? <Link href="/pages/contact-us">Contact us</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="auth-page page-width"><div className="auth-box"><p>Loading…</p></div></div>}>
      <ActivateContent />
    </Suspense>
  )
}
