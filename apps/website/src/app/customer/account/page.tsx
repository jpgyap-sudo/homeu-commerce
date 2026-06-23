'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type PwStep = 'form' | 'otp'

interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
}

export default function CustomerAccountPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwOtp, setPwOtp] = useState('')
  const [pwStep, setPwStep] = useState<PwStep>('form')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwResendTimer, setPwResendTimer] = useState(0)

  useEffect(() => {
    fetch('/api/customers/me', { credentials: 'include' })
      .then(r => {
        if (!r.ok) { router.push('/login'); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setCustomer(data)
        setName(data.name || '')
        setPhone(data.phone || '')
        setCompany(data.company || '')
      })
      .finally(() => setLoading(false))
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!customer) return
    setSaving(true)
    setSuccess(false)
    setError('')
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, phone, company }),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setPwLoading(true)
    try {
      if (pwStep === 'form') {
        // Send OTP first
        const res = await fetch('/api/customers/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'send_otp' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to send verification code')
        // Move to OTP step
        setPwStep('otp')
        startPwResendTimer()
      } else {
        // Verify OTP and change password
        const res = await fetch('/api/customers/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'change_password', currentPassword, newPassword, code: pwOtp }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to change password')
        setPwSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setPwOtp('')
        setPwStep('form')
      }
    } catch (err: any) {
      setPwError(err.message)
    } finally {
      setPwLoading(false)
    }
  }

  function startPwResendTimer() {
    setPwResendTimer(30)
    const interval = setInterval(() => {
      setPwResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  if (loading) return <div className="account-page page-width"><p className="account-loading">Loading…</p></div>

  return (
    <div className="account-page page-width">
      {/* Sidebar nav */}
      <nav className="account-nav">
        <Link href="/customer/dashboard" className="account-nav__link">My Requests</Link>
        <Link href="/customer/account" className="account-nav__link account-nav__link--active">Account Details</Link>
        <Link href="/customer/addresses" className="account-nav__link">Addresses</Link>
        <Link href="/customer/orders" className="account-nav__link">Order History</Link>
      </nav>

      <div className="account-content">
        <h1 className="account-title">Account Details</h1>

        {/* Profile form */}
        <section className="account-section">
          <h2 className="account-section__title">Profile</h2>
          <form onSubmit={handleSave} className="account-form">
            <div className="account-form__field">
              <label>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="account-form__field">
              <label>Email</label>
              <input value={customer?.email || ''} disabled className="account-form__disabled" />
              <p className="account-form__hint">Email cannot be changed. Contact us if needed.</p>
            </div>
            <div className="account-form__field">
              <label>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
            </div>
            <div className="account-form__field">
              <label>Company</label>
              <input value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            {error && <p className="account-form__error">{error}</p>}
            {success && <p className="account-form__success">Profile updated successfully.</p>}
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </section>

        {/* Password change */}
        <section className="account-section">
          <h2 className="account-section__title">Change Password</h2>

          {pwStep === 'otp' ? (
            <form onSubmit={handlePasswordChange} className="account-form">
              <div className="account-form__field">
                <label>Verification Code</label>
                <p className="account-form__hint" style={{ marginBottom: 8 }}>
                  A verification code was sent to your email. Enter it below to confirm the password change.
                </p>
                <input
                  type="text"
                  value={pwOtp}
                  onChange={e => setPwOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 18,
                    letterSpacing: 8,
                    textAlign: 'center',
                  }}
                />
              </div>
              {pwError && <p className="account-form__error">{pwError}</p>}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button type="submit" className="btn btn--primary" disabled={pwLoading || pwOtp.length !== 6}>
                  {pwLoading ? 'Verifying…' : 'Confirm Change'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (pwResendTimer > 0) return
                    try {
                      const res = await fetch('/api/customers/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ action: 'send_otp' }),
                      })
                      if (res.ok) { setPwOtp(''); startPwResendTimer() }
                    } catch {}
                  }}
                  disabled={pwResendTimer > 0}
                  style={{
                    background: 'none', border: 'none', color: pwResendTimer > 0 ? '#999' : '#1a6d3e',
                    fontSize: 13, cursor: pwResendTimer > 0 ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {pwResendTimer > 0 ? `Resend in ${pwResendTimer}s` : 'Resend code'}
                </button>
              </div>
              <p style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => { setPwStep('form'); setPwError(''); setPwOtp('') }}
                  style={{ background: 'none', border: 'none', color: '#667168', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  &larr; Back
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handlePasswordChange} className="account-form">
              <div className="account-form__field">
                <label>Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="account-form__field">
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
              </div>
              <div className="account-form__field">
                <label>Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              {pwError && <p className="account-form__error">{pwError}</p>}
              {pwSuccess && <p className="account-form__success">Password changed successfully.</p>}
              <button type="submit" className="btn btn--primary" disabled={pwLoading}>
                {pwLoading ? 'Sending code…' : 'Change Password'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
