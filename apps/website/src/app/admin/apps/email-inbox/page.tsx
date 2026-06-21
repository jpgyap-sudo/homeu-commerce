'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Email {
  id: number; message_id: string; subject: string; sender_name: string
  sender_email: string; recipient_email: string; body_text: string; body_html: string
  is_read: boolean; is_starred: boolean; category: string
  received_at: string; customer_name: string; customer_email: string
  customer_id: number | null; attachments: any[]; folder: string
}

function toast(msg: string) {
  const el = document.getElementById('inbox-toast')
  if (el) { el.textContent = msg; el.style.opacity = '1'; setTimeout(() => el.style.opacity = '0', 2000) }
}

const CATEGORIES = [
  { key: 'all', label: 'All Mail', icon: '📬' },
  { key: 'inbox', label: 'Inbox', icon: '📥' },
  { key: 'sent', label: 'Sent', icon: '📤' },
  { key: 'inquiry', label: 'Inquiries', icon: '💬' },
  { key: 'rfq', label: 'RFQ', icon: '📋' },
  { key: 'appointment', label: 'Appointments', icon: '📅' },
  { key: 'order', label: 'Orders', icon: '📦' },
  { key: 'support', label: 'Support', icon: '🎧' },
  { key: 'spam', label: 'Spam', icon: '🚫' },
]

function fmtDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 86400000
  if (diff < 1) return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  if (diff < 7) return d.toLocaleDateString('en-PH', { weekday: 'short' })
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function initials(name: string) { return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }

export default function EmailInboxPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [selected, setSelected] = useState<Email | null>(null)
  const [folder, setFolder] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [unread, setUnread] = useState(0)
  const [replyText, setReplyText] = useState('')

  // Compose new email
  const [composing, setComposing] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeCc, setComposeCc] = useState('')
  const [sending, setSending] = useState(false)

  const fetchEmails = useCallback(async () => {
    const params = new URLSearchParams({ folder: 'all', limit: '50' })
    if (search) params.set('search', search)
    if (folder === 'sent') {
      params.set('folder', 'all')
      params.set('category', 'sent')
    } else if (folder && folder !== 'all') {
      params.set('folder', folder)
    }
    const r = await fetch(`/api/admin/email?${params}`)
    if (r.ok) {
      const d = await r.json()
      setEmails(d.emails || [])
      setUnread(d.unread || 0)
    }
    setLoading(false)
  }, [folder, search])

  useEffect(() => { fetchEmails() }, [fetchEmails])

  const doSync = async () => {
    setSyncing(true)
    try {
      const r = await fetch('/api/admin/email/sync', { method: 'POST' })
      const d = await r.json()
      if (r.ok && d.synced > 0) {
        toast(`✅ Synced ${d.synced} emails${d.linked ? ` · ${d.linked} linked` : ''}`)
        fetchEmails()
      } else if (r.ok && d.synced === 0 && !d.error) {
        toast('ℹ️ No new emails found')
      } else {
        toast(`❌ ${d.error || 'Sync failed — check IMAP settings'}`)
      }
    } catch (err: any) {
      toast(`❌ Network error: ${err.message}`)
    }
    setSyncing(false)
  }

  const markRead = async (id: number, read: boolean) => {
    await fetch('/api/admin/email', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_read: read })
    })
    setEmails(prev => prev.map(e => e.id === id ? { ...e, is_read: read } : e))
    setUnread(prev => read ? Math.max(0, prev - 1) : prev + 1)
  }

  const categorize = async (id: number, category: string) => {
    await fetch('/api/admin/email', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, category })
    })
    setEmails(prev => prev.map(e => e.id === id ? { ...e, category } : e))
    toast(`Moved to ${category}`)
    setSelected(null)
  }

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return
    const r = await fetch('/api/admin/email/reply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: selected.sender_email, subject: selected.subject, text: replyText, inReplyTo: selected.message_id })
    })
    if (r.ok) { toast('✅ Reply sent!'); setReplyText('') }
    else toast('Failed to send reply')
  }

  const markAllRead = async () => {
    await fetch('/api/admin/email', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true })
    })
    setEmails(prev => prev.map(e => ({ ...e, is_read: true })))
    setUnread(0)
    toast('All marked read')
  }

  const sendNewEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) return toast('To, Subject, and Body are required')
    setSending(true)
    const r = await fetch('/api/admin/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: composeTo, subject: composeSubject, body: composeBody, cc: composeCc })
    })
    if (r.ok) {
      toast('✅ Email sent!')
      setComposing(false)
      setComposeTo(''); setComposeSubject(''); setComposeBody(''); setComposeCc('')
      fetchEmails()
    } else {
      const d = await r.json()
      toast('Failed: ' + (d.error || 'unknown'))
    }
    setSending(false)
  }

  return (
    <div>
      <header className="luxe-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <h1 className="luxe-page-title" style={{ margin: 0 }}>📬 Email Inbox</h1>
          {unread > 0 && (
            <span className="luxe-badge info" style={{ fontSize: 12 }}>{unread} unread</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <button onClick={doSync} disabled={syncing} className="luxe-btn luxe-btn-primary luxe-btn-sm">
            {syncing ? '🔄 Syncing...' : '🔄 Sync Now'}
          </button>
          <button onClick={() => setComposing(true)} className="luxe-btn luxe-btn-gold luxe-btn-sm">
            ✉️ Compose
          </button>
          <button onClick={markAllRead} className="luxe-btn luxe-btn-ghost luxe-btn-sm">✓ Mark All Read</button>
        </div>
      </header>

      <div id="inbox-toast" style={{ position:'fixed', bottom:24,right:24, zIndex:9999,
        background:'var(--luxe-navy-900)',color:'#fff',padding:'12px 20px',
        borderRadius:'var(--radius-md)',fontSize:13,fontWeight:500,opacity:0,
        transition:'opacity 300ms ease',pointerEvents:'none',boxShadow:'var(--shadow-lg)'}} />

      {loading ? (
        <div className="luxe-empty"><div className="luxe-empty-icon">📬</div><p className="luxe-empty-title">Loading inbox...</p></div>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-4)', minHeight: '60vh' }}>
          {/* Left: Category sidebar */}
          <div style={{ width: 180, flexShrink: 0 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => { setFolder(cat.key); setSelected(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '10px 14px',
                  width: '100%', border: 'none', borderLeft: folder === cat.key ? '3px solid var(--luxe-gold-500)' : '3px solid transparent',
                  cursor: 'pointer', fontSize: 13, fontWeight: folder === cat.key ? 600 : 400,
                  background: folder === cat.key ? 'rgba(201,160,80,0.06)' : 'transparent',
                  color: folder === cat.key ? 'var(--luxe-navy-900)' : 'var(--luxe-slate-600)',
                  textAlign: 'left', transition: 'all 150ms ease', marginBottom: 2, borderRadius: '0 6px 6px 0',
                }}>
                <span>{cat.icon}</span> {cat.label}
                {cat.key !== 'all' && cat.key !== 'spam' && cat.key !== folder && unread > 0 && cat.key === 'inbox' && (
                  <span style={{ marginLeft: 'auto', background: 'var(--luxe-navy-900)', color: '#fff', padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{unread}</span>
                )}
              </button>
            ))}
          </div>

          {/* Center: Email list */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="luxe-search" style={{ marginBottom: 'var(--space-3)' }}>
              <span className="luxe-search-icon">🔍</span>
              <input className="luxe-input" placeholder="Search emails..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="luxe-card" style={{ overflow: 'hidden' }}>
              {emails.length === 0 ? (
                <div className="luxe-empty" style={{ padding: 'var(--space-12) var(--space-4)' }}>
                  <div className="luxe-empty-icon">📭</div>
                  <p className="luxe-empty-title">No emails</p>
                  <p className="luxe-empty-desc">Connect your Zoho email in .env or click Sync to fetch messages.</p>
                </div>
              ) : emails.map(email => (
                <div key={email.id} onClick={() => { setSelected(email); markRead(email.id, true) }}
                  style={{
                    display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--luxe-warm-100)', cursor: 'pointer',
                    background: selected?.id === email.id ? 'rgba(201,160,80,0.06)' : !email.is_read ? 'var(--luxe-warm-50)' : '#fff',
                    transition: 'all 100ms ease',
                  }}>
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                    background: email.is_read ? 'var(--luxe-warm-200)' : 'linear-gradient(135deg, var(--luxe-gold-400), var(--luxe-gold-300))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: email.is_read ? 'var(--luxe-slate-400)' : '#fff',
                  }}>{initials(email.sender_name || email.sender_email)}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: email.is_read ? 500 : 700, color: 'var(--luxe-charcoal)' }}>
                        {email.sender_name || email.sender_email}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--luxe-slate-400)', fontFamily: 'var(--font-mono)' }}>
                        {fmtDate(email.received_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: email.is_read ? 400 : 600, color: 'var(--luxe-navy-900)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {email.subject}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--luxe-slate-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {(email.body_text || '').substring(0, 100)}
                      </span>
                      {email.category !== 'inbox' && email.category !== 'all' && (
                        <span className={`luxe-badge ${email.category === 'rfq' ? 'info' : email.category === 'appointment' ? 'warning' : email.category === 'support' ? 'danger' : 'success'}`} style={{ fontSize: 9 }}>{email.category}</span>
                      )}
                      {email.customer_id && <span className="luxe-badge success" style={{ fontSize: 9 }}>🔄 Customer</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Detail panel */}
          {selected && (
            <div style={{ width: 400, flexShrink: 0 }}>
              <div className="luxe-card" style={{ minHeight: '50vh', maxHeight: '75vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--luxe-warm-100)' }}>
                  <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 15, fontWeight: 600, color: 'var(--luxe-navy-900)', lineHeight: 1.3 }}>{selected.subject}</h3>
                  <div style={{ fontSize: 12, color: 'var(--luxe-slate-500)', lineHeight: 1.6 }}>
                    <div><strong>From:</strong> {selected.sender_name ? `${selected.sender_name} <${selected.sender_email}>` : selected.sender_email}</div>
                    <div><strong>Date:</strong> {new Date(selected.received_at).toLocaleString('en-PH')}</div>
                    {selected.customer_name && <div><strong>Customer:</strong> <Link href={`/admin/customers/${selected.customer_id}`} style={{ color: 'var(--luxe-sapphire)' }}>{selected.customer_name}</Link></div>}
                  </div>
                  {/* Actions bar */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
                    <select className="luxe-select" value={selected.category} onChange={e => categorize(selected.id, e.target.value)}
                      style={{ fontSize: 11, padding: '4px 8px', width: 'auto' }}>
                      <option value="inquiry">💬 Inquiry</option>
                      <option value="rfq">📋 RFQ</option>
                      <option value="appointment">📅 Appointment</option>
                      <option value="order">📦 Order</option>
                      <option value="support">🎧 Support</option>
                      <option value="spam">🚫 Spam</option>
                    </select>
                    <button onClick={() => categorize(selected.id, 'spam')} className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ fontSize: 10 }}>🚫 Spam</button>
                  </div>
                </div>

                {/* Email body */}
                <div style={{ flex: 1, padding: 'var(--space-4) var(--space-5)', overflow: 'auto', fontSize: 13, lineHeight: 1.6, color: 'var(--luxe-charcoal)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selected.body_html ? (
                    <div dangerouslySetInnerHTML={{ __html: selected.body_html }} style={{ maxWidth: '100%' }} />
                  ) : selected.body_text || '(No content)'}
                </div>

                {/* Attachments */}
                <AttachmentsList emailId={selected.id} />

                {/* Reply box */}
                <div style={{ padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--luxe-warm-100)' }}>
                  <textarea className="luxe-input" rows={3} placeholder="Type your reply..."
                    value={replyText} onChange={e => setReplyText(e.target.value)}
                    style={{ fontSize: 13, marginBottom: 'var(--space-2)', resize: 'vertical' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={sendReply} className="luxe-btn luxe-btn-gold luxe-btn-sm" disabled={!replyText.trim()}>
                      📤 Send Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compose Modal */}
      {composing && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setComposing(false)}>
          <div className="luxe-card" style={{ width: 640, maxWidth:'90vw', maxHeight:'90vh', overflow:'auto' }} onClick={e => e.stopPropagation()}>
            <div className="luxe-card-header">
              <h2 className="luxe-card-title">✉️ Compose Email</h2>
              <span className="luxe-badge info">From: sales@homeatelier.ph</span>
            </div>
            <div className="luxe-card-body">
              <div style={{ marginBottom:'var(--space-4)' }}>
                <input className="luxe-input" placeholder="To: recipient@example.com" value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  style={{ fontSize:13, marginBottom:'var(--space-2)' }} />
                <input className="luxe-input" placeholder="CC: (optional)" value={composeCc}
                  onChange={e => setComposeCc(e.target.value)}
                  style={{ fontSize:13, marginBottom:'var(--space-2)' }} />
                <input className="luxe-input" placeholder="Subject" value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  style={{ fontSize:13, marginBottom:'var(--space-2)' }} />
              </div>
              <textarea className="luxe-input" rows={10} placeholder="Write your email..."
                value={composeBody} onChange={e => setComposeBody(e.target.value)}
                style={{ fontSize:13, resize:'vertical', fontFamily:'var(--font-body)', lineHeight:1.6 }} />
              <div style={{ display:'flex', gap:'var(--space-3)', justifyContent:'flex-end', marginTop:'var(--space-4)' }}>
                <button onClick={() => setComposing(false)} className="luxe-btn luxe-btn-ghost luxe-btn-sm">Discard</button>
                <button onClick={sendNewEmail} disabled={sending} className="luxe-btn luxe-btn-gold luxe-btn-sm">
                  {sending ? '📤 Sending...' : '📤 Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Attachments List Component ─────────────────────────────────────

function AttachmentsList({ emailId }: { emailId: number }) {
  const [atts, setAtts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!emailId) return
    setLoading(true)
    fetch(`/api/admin/email/attachments?emailId=${emailId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setAtts(d.attachments || []))
      .catch(() => setAtts([]))
      .finally(() => setLoading(false))
  }, [emailId])

  if (loading) return null
  if (atts.length === 0) return null

  return (
    <div style={{ padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--luxe-warm-100)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--luxe-slate-500)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        📎 Attachments ({atts.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {atts.map((att: any) => (
          <a key={att.id} href={`/api/admin/email/attachments?id=${att.id}&download=1`} target="_blank" rel="noopener"
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '6px 10px',
              borderRadius: 6, textDecoration: 'none', fontSize: 12, color: 'var(--luxe-sapphire)',
              background: 'var(--luxe-sapphire-bg, #eff6ff)', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
            onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
          >
            <span>{getFileIcon(att.content_type)}</span>
            <span style={{ flex: 1, fontWeight: 500 }}>{att.filename}</span>
            {att.size_bytes > 0 && (
              <span style={{ fontSize: 10, color: 'var(--luxe-slate-400)', fontFamily: 'var(--font-mono)' }}>
                {att.size_bytes > 1024 * 1024
                  ? (att.size_bytes / 1024 / 1024).toFixed(1) + ' MB'
                  : (att.size_bytes / 1024).toFixed(0) + ' KB'}
              </span>
            )}
            {att.cdn_url && <span style={{ fontSize: 10, color: '#059669' }}>☁️</span>}
          </a>
        ))}
      </div>
    </div>
  )
}

function getFileIcon(mime: string): string {
  if (!mime) return '📎'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📄'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('sheet')) return '📊'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📽️'
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return '📦'
  return '📎'
}
