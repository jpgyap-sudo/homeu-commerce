'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const BRAND_LOGO = 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/uploads/efd19283f64781b5bde261b2ddfb68f2168affb76ed6e34f642c1b3b0f58d8af.png'

type Step = 'form' | 'otp'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true) // auto-checked
  const [acceptedTerms, setAcceptedTerms] = useState(true) // auto-checked

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/customers/register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', email, name, phone }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to send verification code')
      }

      // Move to OTP step
      setStep('otp')
      startResendTimer()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/customers/register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_registration',
          email,
          code: otp,
          name,
          phone,
          password,
          subscribe_newsletter: subscribeNewsletter,
          accepted_terms: acceptedTerms,
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

  async function handleResend() {
    if (resendTimer > 0) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/customers/register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', email, name, phone }),
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

  if (step === 'otp') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#faf9f6' }}>
        <style>{`
          @keyframes registerLogoJump {
            0%, 100% { transform: translateY(0) scale(1); }
            30% { transform: translateY(-14px) scale(1.04); }
            50% { transform: translateY(0) scale(0.98); }
            65% { transform: translateY(-4px) scale(1.01); }
          }
          .register-brand-logo-badge {
            animation: registerLogoJump 2.6s ease-in-out infinite;
          }
        `}</style>
        {/* Left brand panel */}
        <div style={{
          flex: '0 0 400px', background: 'linear-gradient(135deg, #151a17 0%, #2a3228 50%, #1a2620 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: 48, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.04, background: 'radial-gradient(circle at 30% 50%, #fff 0%, transparent 60%), radial-gradient(circle at 70% 80%, #b88935 0%, transparent 50%)' }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            {BRAND_LOGO ? (
              <div
                className="register-brand-logo-badge"
                style={{
                  width: 240, height: 240, margin: '0 auto 24px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fff 0%, #fdf6e8 100%)',
                  border: '3px solid #b88935',
                  boxShadow: '0 10px 28px rgba(184, 137, 53, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <img src={BRAND_LOGO} alt="Home Atelier" style={{ width: 180, height: 180, objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            )}
            <h1 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 32, fontWeight: 400, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Check your email</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, maxWidth: 280 }}>
              We sent a 6-digit verification code to <strong style={{ color: '#fff' }}>{email}</strong>
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 28, fontWeight: 400, color: '#151a17', margin: '0 0 6px' }}>Verify your email</h2>
              <p style={{ fontSize: 14, color: '#667168', margin: 0 }}>
                Enter the verification code sent to your email. It expires in 5 minutes.
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
                {loading ? 'Verifying…' : 'Create Account'}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button
                onClick={handleResend}
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

            <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#667168' }}>
              <button
                onClick={() => { setStep('form'); setError(''); setOtp('') }}
                style={{ background: 'none', border: 'none', color: '#667168', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
              >
                &larr; Back to registration form
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#faf9f6' }}>
      <style>{`
        @keyframes registerLogoJump {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-14px) scale(1.04); }
          50% { transform: translateY(0) scale(0.98); }
          65% { transform: translateY(-4px) scale(1.01); }
        }
        .register-brand-logo-badge {
          animation: registerLogoJump 2.6s ease-in-out infinite;
        }
      `}</style>
      {/* Left brand panel */}
      <div style={{
        flex: '0 0 400px', background: 'linear-gradient(135deg, #151a17 0%, #2a3228 50%, #1a2620 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: 48, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, background: 'radial-gradient(circle at 30% 50%, #fff 0%, transparent 60%), radial-gradient(circle at 70% 80%, #b88935 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          {BRAND_LOGO ? (
            <div
              className="register-brand-logo-badge"
              style={{
                width: 240, height: 240, margin: '0 auto 24px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #fff 0%, #fdf6e8 100%)',
                border: '3px solid #b88935',
                boxShadow: '0 10px 28px rgba(184, 137, 53, 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <img src={BRAND_LOGO} alt="Home Atelier" style={{ width: 180, height: 180, objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏡</div>
          )}
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

            {/* Newsletter subscription — auto-checked */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              fontSize: 13, color: '#667168', lineHeight: 1.4,
            }}>
              <input
                type="checkbox"
                checked={subscribeNewsletter}
                onChange={e => setSubscribeNewsletter(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#1a6d3e', cursor: 'pointer', flexShrink: 0 }}
              />
              <span>Subscribe to our newsletter to receive updates on new arrivals, exclusive offers, and design inspiration.</span>
            </label>

            {/* Privacy & Terms consent — required */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
              fontSize: 13, color: '#667168', lineHeight: 1.4,
            }}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#1a6d3e', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
              />
              <span>
                I agree to the{' '}
                <Link href="/privacy-policy" target="_blank" style={{ color: '#1a6d3e', textDecoration: 'underline' }}>
                  Privacy Policy
                </Link>
                {' '}and{' '}
                <Link href="/terms-of-service" target="_blank" style={{ color: '#1a6d3e', textDecoration: 'underline' }}>
                  Terms of Service
                </Link>
                .
              </span>
            </label>

            <button type="submit" disabled={loading || !acceptedTerms} style={{
              padding: '14px 28px', background: '#151a17', color: '#fff', border: 'none',
              borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: (loading || !acceptedTerms) ? 'not-allowed' : 'pointer',
              opacity: (loading || !acceptedTerms) ? 0.7 : 1, transition: 'opacity 0.15s', marginTop: 4,
            }}>
              {loading ? 'Sending code…' : 'Send Verification Code'}
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
