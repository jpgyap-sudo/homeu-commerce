'use client'

import { useState, FormEvent, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import siteConfig from '@/data/site-config.json'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
const BRAND_LOGO = 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/uploads/reviews/bdda42a44380cbd7858cdc620097aed8e17f7bd2d1837be245688e77c9942ba5.png'

type Step = 'login' | 'otp_verify'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [pendingUserId, setPendingUserId] = useState<number | null>(null)
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

  // Generate a simple device fingerprint from available browser signals
  function getDeviceId(): string {
    const signals = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
    ]
    const hash = signals.join('||')
    // Simple hash
    let h = 0
    for (let i = 0; i < hash.length; i++) {
      h = ((h << 5) - h) + hash.charCodeAt(i)
      h = h & h // Convert to 32-bit integer
    }
    return 'browser_' + Math.abs(h).toString(36)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      // First attempt: check if OTP is needed for this device
      const res = await fetch('/api/customers/login-device-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Regular login failure
        throw new Error(data.errors?.[0]?.message || 'Login failed')
      }

      if (data.requires_device_otp) {
        // OTP required — show OTP verification step
        setPendingUserId(data.user?.id || null)
        setStep('otp_verify')
        startResendTimer()
        return
      }

      // Normal login (no OTP required)
      router.push('/customer/dashboard'); router.refresh()
    } catch (err: any) { setError(err.message || 'Invalid email or password') }
    finally { setLoading(false) }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const deviceId = getDeviceId()
      const res = await fetch('/api/customers/login-device-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_login',
          email,
          code: otp,
          deviceId,
          trustDevice: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.errors?.[0]?.message || 'Verification failed')
      }

      router.push('/customer/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    if (resendTimer > 0 || loading) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/customers/login-device-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to resend')
      }

      setOtp('')
      startResendTimer()
    } catch (err: any) {
      setError(err.message || 'Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  function startResendTimer() {
    setResendTimer(30)
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
    fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f7f9f6', color: '#151a17',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  // ── OTP Verification Step ──────────────────────────────────────
  if (step === 'otp_verify') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#faf9f6' }}>
        {/* Left brand panel */}
        <div style={{
          flex: '0 0 480px', background: 'linear-gradient(135deg, #eaf4fb 0%, #d7ebf8 50%, #c3e0f3 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: 48, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.05, background: 'radial-gradient(circle at 30% 50%, #fff 0%, transparent 60%), radial-gradient(circle at 70% 80%, #b88935 0%, transparent 50%)' }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
            <h2 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 28, fontWeight: 400, color: '#151a17', margin: '0 0 8px' }}>Verify it's you</h2>
            <p style={{ color: 'rgba(26,38,32,0.65)', fontSize: 14, lineHeight: 1.6, maxWidth: 260 }}>
              We sent a verification code to <strong>{email}</strong> since this device isn't recognized.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 28, fontWeight: 400, color: '#151a17', margin: '0 0 6px' }}>Enter verification code</h2>
              <p style={{ fontSize: 14, color: '#667168', margin: 0 }}>
                A 6-digit code was sent to your email. It expires in 5 minutes.
              </p>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 500, border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  style={{
                    ...inputStyle,
                    textAlign: 'center',
                    fontSize: 28,
                    letterSpacing: 12,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                  }}
                  onFocus={e => e.target.style.borderColor = '#151a17'}
                  onBlur={e => e.target.style.borderColor = '#d9e0d7'}
                />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} style={{
                padding: '14px 28px', background: '#151a17', color: '#fff', border: 'none',
                borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer',
                opacity: (loading || otp.length !== 6) ? 0.7 : 1, transition: 'opacity 0.15s', marginTop: 4,
              }}>
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || loading}
                style={{
                  background: 'none', border: 'none', color: resendTimer > 0 ? '#9aa69c' : '#1a6d3e',
                  fontSize: 13, fontWeight: 500, cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
              </button>
            </div>

            <p style={{ marginTop: 16, textAlign: 'center' }}>
              <button
                onClick={() => { setStep('login'); setError(''); setOtp('') }}
                style={{ background: 'none', border: 'none', color: '#667168', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
              >
                &larr; Back to login
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Login Form Step ─────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#faf9f6' }}>
      {/* Left brand panel */}
      <div style={{
        flex: '0 0 480px', background: 'linear-gradient(135deg, #eaf4fb 0%, #d7ebf8 50%, #c3e0f3 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: 48, position: 'relative', overflow: 'hidden',
      }}>
        <style>{`
          @keyframes loginLogoJump {
            0%, 100% { transform: translateY(0) scale(1); }
            30% { transform: translateY(-14px) scale(1.04); }
            50% { transform: translateY(0) scale(0.98); }
            65% { transform: translateY(-4px) scale(1.01); }
          }
          .login-brand-logo-badge {
            animation: loginLogoJump 2.6s ease-in-out infinite;
          }
        `}</style>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, background: 'radial-gradient(circle at 30% 50%, #fff 0%, transparent 60%), radial-gradient(circle at 70% 80%, #b88935 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          {BRAND_LOGO ? (
            <div
              className="login-brand-logo-badge"
              style={{
                width: 320, height: 320, margin: '0 auto 16px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #fff 0%, #fdf6e8 100%)',
                border: '4px solid #b88935',
                boxShadow: '0 12px 36px rgba(184, 137, 53, 0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <img src={BRAND_LOGO} alt="Home Atelier" style={{ width: 240, height: 240, objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏡</div>
          )}
          <p style={{ color: 'rgba(26,38,32,0.65)', fontSize: 14, lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
            Curated furniture and timeless pieces for the modern homeowners. Offering customized solutions, crafted with care.
          </p>
          <div style={{ marginTop: 32, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#b88935' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(26,38,32,0.15)' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(26,38,32,0.15)' }} />
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
