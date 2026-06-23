'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

type Status = 'verifying' | 'success' | 'error'

function VerifyLinkContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link. No token provided.')
      return
    }

    fetch('/api/verify-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.verified) {
          setStatus('success')
          setMessage('Your email has been verified successfully!')
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed. The link may have expired.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Something went wrong. Please try again or use the verification code.')
      })
  }, [searchParams])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#faf9f6' }}>
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {status === 'verifying' ? '⏳' : status === 'success' ? '✅' : '❌'}
        </div>
        <h1 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 28, fontWeight: 400, color: '#151a17', marginBottom: 12 }}>
          {status === 'verifying' ? 'Verifying…' :
           status === 'success' ? 'Verified!' :
           'Verification Failed'}
        </h1>
        <p style={{ fontSize: 14, color: '#667168', lineHeight: 1.6, marginBottom: 24 }}>{message}</p>

        {status === 'verifying' && (
          <p style={{ fontSize: 13, color: '#9aa69c' }}>Please wait while we verify your email…</p>
        )}

        {status === 'success' && (
          <Link href="/login" style={{
            display: 'inline-block', padding: '12px 28px', background: '#151a17', color: '#fff',
            borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            Sign In
          </Link>
        )}

        {status === 'error' && (
          <Link href="/login" style={{
            display: 'inline-block', padding: '12px 28px', background: '#151a17', color: '#fff',
            borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            Back to Login
          </Link>
        )}
      </div>
    </div>
  )
}

export default function VerifyLinkPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#faf9f6' }}>
        <p style={{ color: '#667168' }}>Loading…</p>
      </div>
    }>
      <VerifyLinkContent />
    </Suspense>
  )
}
