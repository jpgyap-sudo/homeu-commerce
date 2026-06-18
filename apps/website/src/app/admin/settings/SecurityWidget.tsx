'use client'

import { useState, useEffect } from 'react'

export default function SecuritySettingsWidget() {
  return (
    <div className="luxe-card">
      <div className="luxe-card-header"><h2 className="luxe-card-title">🔧 Security & Settings</h2></div>
      <div className="luxe-card-body">
        <PasswordChangeForm />
        <ThemeToggle />
        <OTPToggle />
        <ActivityFeed />
      </div>
    </div>
  )
}

function PasswordChangeForm() {
  const [current, setCurrent] = useState('')
  const [newPw, setNewPw] = useState('')
  const [msg, setMsg] = useState('')

  const changePw = async () => {
    if (!current || !newPw) return setMsg('Both fields required')
    const r = await fetch('/api/admin/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: newPw })
    })
    const d = await r.json()
    setMsg(d.success ? '✅ Password changed!' : '❌ ' + (d.error || 'Failed'))
    if (d.success) { setCurrent(''); setNewPw('') }
  }

  return <Widget title="🔑 Change Password">
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
      <input className="luxe-input" type="password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} />
      <input className="luxe-input" type="password" placeholder="New password (min 6 chars)" value={newPw} onChange={e => setNewPw(e.target.value)} />
    </div>
    {msg && <div style={{ fontSize: 12, marginBottom: 'var(--space-2)', color: msg.includes('✅') ? 'var(--luxe-emerald)' : 'var(--luxe-merlot)' }}>{msg}</div>}
    <button onClick={changePw} className="luxe-btn luxe-btn-gold luxe-btn-sm">Change Password</button>
  </Widget>
}

function ThemeToggle() {
  const [theme, setTheme] = useState('light')
  useEffect(() => { setTheme(localStorage.getItem('admin-theme') || 'light') }, [])

  const toggle = (t: string) => {
    setTheme(t)
    localStorage.setItem('admin-theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  return <Widget title="🎨 Theme">
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      {['light','dark'].map(t => (
        <button key={t} onClick={() => toggle(t)}
          className={`luxe-btn luxe-btn-sm ${theme === t ? 'luxe-btn-primary' : 'luxe-btn-ghost'}`}
          style={{ fontSize: 12, textTransform: 'capitalize' }}>
          {t === 'light' ? '☀️ Light' : '🌙 Dark'}
        </button>
      ))}
    </div>
  </Widget>
}

function OTPToggle() {
  const [otp, setOtp] = useState('')
  const [msg, setMsg] = useState('')

  const generateOTP = async () => {
    const r = await fetch('/api/admin/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate', email: 'admin@homeatelier.ph' })
    })
    const d = await r.json()
    setOtp(d.code || '')
    setMsg('Demo OTP generated (in production, sent via email/SMS)')
  }

  return <Widget title="🔐 Two-Factor (OTP)">
    <p style={{ fontSize: 12, color: 'var(--luxe-slate-400)', margin: '0 0 var(--space-3)' }}>Enable one-time password on login for extra security.</p>
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
      <button onClick={generateOTP} className="luxe-btn luxe-btn-primary luxe-btn-sm">📱 Generate OTP Test</button>
      {otp && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--luxe-blue-600)', padding: '4px 12px', background: 'var(--luxe-blue-50)', borderRadius: 6 }}>{otp}</span>}
    </div>
    {msg && <div style={{ fontSize: 11, marginTop: 'var(--space-2)', color: 'var(--luxe-slate-400)' }}>{msg}</div>}
  </Widget>
}

function ActivityFeed() {
  const [activities, setActivities] = useState<any[]>([])
  useEffect(() => { fetch('/api/admin/activity').then(r => r.json()).then(d => setActivities(d.activities || [])).catch(() => {}) }, [])

  return <Widget title="📋 Recent Activity">
    {activities.length === 0 ? (
      <div style={{ fontSize: 12, color: 'var(--luxe-slate-400)' }}>No activity yet.</div>
    ) : (
      <table className="luxe-table" style={{ margin: 0 }}>
        <thead><tr><th>User</th><th>Action</th><th>Time</th></tr></thead>
        <tbody>
          {activities.slice(0, 10).map((a: any) => (
            <tr key={a.id}>
              <td className="text-cell" style={{ fontSize: 12 }}>{a.user_email}</td>
              <td className="text-cell" style={{ fontSize: 12 }}>{a.action.replace(/_/g, ' ')}</td>
              <td style={{ fontSize: 11, color: 'var(--luxe-slate-400)', fontFamily: 'var(--font-mono)' }}>{new Date(a.created_at).toLocaleString('en-PH')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </Widget>
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--luxe-warm-100)' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--luxe-navy-900)', marginBottom: 'var(--space-3)' }}>{title}</div>
      {children}
    </div>
  )
}
