'use client'

import { useState, useEffect, useCallback } from 'react'
import type { InboxTab, UnifiedConversation, UnifiedMessage } from '@/lib/central-inbox/service'

const TABS: { key: InboxTab; label: string; icon: string }[] = [
  { key: 'all', label: 'All Inbox', icon: '📬' },
  { key: 'website', label: 'Website Chat', icon: '💬' },
  { key: 'email', label: 'Email', icon: '📧' },
  { key: 'rfq', label: 'RFQ Chat', icon: '📋' },
  { key: 'facebook', label: 'Facebook', icon: '📘' },
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'archived', label: 'Archived', icon: '📦' },
]

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 86400000
  if (diff < 1) return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  if (diff < 7) return d.toLocaleDateString('en-PH', { weekday: 'short' })
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function initials(name: string) { return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }

const CHANNEL_COLORS: Record<string, string> = {
  website: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
  email: 'linear-gradient(135deg, #c9a050, #d4b36a)',
  rfq: 'linear-gradient(135deg, #10b981, #34d399)',
  facebook: 'linear-gradient(135deg, #1877f2, #3b82f6)',
  instagram: 'linear-gradient(135deg, #e4405f, #fd5949)',
}

export default function CentralInboxPage() {
  const [tab, setTab] = useState<InboxTab>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [conversations, setConversations] = useState<UnifiedConversation[]>([])
  const [selected, setSelected] = useState<UnifiedConversation | null>(null)
  const [messages, setMessages] = useState<UnifiedMessage[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [rfqDetails, setRfqDetails] = useState<any>(null)
  const [otherConversations, setOtherConversations] = useState<any[]>([])
  const [unreadCounts, setUnreadCounts] = useState<{
    all: number
    website: number
    email: number
    rfq: number
    facebook: number
    instagram: number
  }>({ all: 0, website: 0, email: 0, rfq: 0, facebook: 0, instagram: 0 })

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tab, limit: '50', statusFilter })
    if (search) params.set('search', search)
    const r = await fetch(`/api/admin/central-inbox?${params}`)
    if (r.ok) {
      const d = await r.json()
      setConversations(d.conversations || [])
      if (d.unreadCounts) {
        setUnreadCounts(d.unreadCounts)
      }
    }
    setLoading(false)
  }, [tab, search, statusFilter])

  const fetchMessages = async (conv: UnifiedConversation) => {
    setSelected(conv)
    setRfqDetails(null)
    setOtherConversations([])
    const r = await fetch(`/api/admin/central-inbox?conversationId=${conv.id}&channel=${conv.channel}`)
    if (r.ok) {
      const d = await r.json()
      setMessages(d.messages || [])
      setRfqDetails(d.rfqDetails || null)
      setOtherConversations(d.otherConversations || [])
      if (conv.unreadCount > 0) {
        await fetch('/api/admin/central-inbox', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: conv.id, channel: conv.channel, action: 'read' })
        })
        fetchConversations()
        setSelected(prev => prev ? { ...prev, unreadCount: 0 } : null)
      }
    }
  }

  const toggleStatus = async (action: 'read' | 'unread' | 'archive' | 'unarchive') => {
    if (!selected) return
    const r = await fetch('/api/admin/central-inbox', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selected.id, channel: selected.channel, action })
    })
    if (r.ok) {
      fetchConversations()
      if (action === 'archive' || action === 'unarchive') {
        setSelected(null)
      } else {
        setSelected(prev => prev ? {
          ...prev,
          unreadCount: action === 'read' ? 0 : 1
        } : null)
      }
    }
  }

  useEffect(() => { fetchConversations() }, [fetchConversations])

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return
    setSending(true)
    const r = await fetch('/api/admin/central-inbox/reply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selected.id, channel: selected.channel, body: replyText })
    })
    if (r.ok) { setReplyText(''); fetchMessages(selected) }
    setSending(false)
  }

  return (
    <div>
      <header className="luxe-page-header">
        <h1 className="luxe-page-title">📬 Central Inbox</h1>
        <p className="luxe-page-subtitle">Unified messaging — all customer conversations in one place.</p>
      </header>

      {/* Channel Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const count = t.key !== 'archived' ? unreadCounts[t.key as keyof typeof unreadCounts] : 0
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setSelected(null) }}
              className={`luxe-btn ${tab === t.key ? 'luxe-btn-primary' : 'luxe-btn-ghost'} luxe-btn-sm`}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {t.icon} {t.label}
              {count > 0 && (
                <span style={{
                  background: tab === t.key ? '#fff' : 'var(--luxe-blue-600)',
                  color: tab === t.key ? 'var(--luxe-blue-600)' : '#fff',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
        <div style={{ marginLeft: 'auto' }}>
          <div className="luxe-search" style={{ width: 240 }}>
            <span className="luxe-search-icon">🔍</span>
            <input className="luxe-input" placeholder="Search conversations..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Sub-filters for Read/Unread status */}
      <div style={{ display: 'flex', gap: 'var(--space-1.5)', marginBottom: 'var(--space-4)', padding: '0 var(--space-1)' }}>
        {(['all', 'unread', 'read'] as const).map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setSelected(null) }}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--luxe-warm-200)',
              background: statusFilter === s ? 'var(--luxe-blue-600)' : '#fff',
              color: statusFilter === s ? '#fff' : 'var(--luxe-slate-600)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 100ms ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
            {s === 'all' ? 'All Messages' : s === 'unread' ? 'Unread' : 'Read'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', minHeight: '75vh', height: 'calc(100vh - 220px)' }}>
        {/* Conversation List Column */}
        <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="luxe-card" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div className="luxe-empty" style={{ padding: 'var(--space-12) var(--space-4)', margin: 'auto' }}>
                <div className="luxe-empty-icon">📬</div>
                <p className="luxe-empty-title">Loading inbox...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="luxe-empty" style={{ padding: 'var(--space-12) var(--space-4)', margin: 'auto' }}>
                <div className="luxe-empty-icon">📭</div>
                <p className="luxe-empty-title">No conversations</p>
                <p className="luxe-empty-desc">Messages will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {conversations.map(conv => (
                  <div key={conv.id} onClick={() => fetchMessages(conv)}
                    style={{
                      display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
                      borderBottom: '1px solid var(--luxe-warm-100)', cursor: 'pointer',
                      background: selected?.id === conv.id ? 'rgba(37,99,235,0.04)' : '#fff',
                      transition: 'all 100ms ease',
                    }}>
                    {/* Avatar with channel indicator */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 'var(--radius-sm)',
                        background: CHANNEL_COLORS[conv.channel] || 'var(--luxe-warm-300)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#fff',
                      }}>{initials(conv.contactName)}</div>
                      <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}>{conv.channel === 'website' ? '💬' : conv.channel === 'email' ? '📧' : conv.channel === 'rfq' ? '📋' : '💬'}</div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: conv.unreadCount > 0 ? 700 : 500, color: 'var(--luxe-charcoal)' }}>
                          {conv.contactName}
                        </span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {conv.unreadCount > 0 && (
                            <span style={{ background: 'var(--luxe-blue-600)', color: '#fff', padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{conv.unreadCount}</span>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--luxe-slate-400)', fontFamily: 'var(--font-mono)' }}>{fmtTime(conv.lastMessageAt)}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--luxe-navy-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.subject}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.lastMessage ? conv.lastMessage.substring(0, 100) : 'No messages'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Thread & Sidebar Context Pane */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
          {selected ? (
            <div className="luxe-card" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Message Thread */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--luxe-warm-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                      background: CHANNEL_COLORS[selected.channel] || 'var(--luxe-warm-300)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>{initials(selected.contactName)}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--luxe-navy-900)' }}>{selected.contactName}</div>
                      <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)' }}>{selected.channel.toUpperCase()} · {selected.contactEmail}</div>
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(selected.unreadCount > 0 || (conversations.find(c => c.id === selected.id)?.unreadCount ?? 0) > 0) ? (
                      <button onClick={() => toggleStatus('read')} title="Mark as Read" className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ padding: '4px 8px', fontSize: 12 }}>
                        ✉️ Read
                      </button>
                    ) : (
                      <button onClick={() => toggleStatus('unread')} title="Mark as Unread" className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ padding: '4px 8px', fontSize: 12 }}>
                        📩 Unread
                      </button>
                    )}
                    {tab === 'archived' ? (
                      <button onClick={() => toggleStatus('unarchive')} title="Move to Inbox" className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ padding: '4px 8px', fontSize: 12 }}>
                        📥 Unarchive
                      </button>
                    ) : (
                      <button onClick={() => toggleStatus('archive')} title="Archive" className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ padding: '4px 8px', fontSize: 12 }}>
                        📦 Archive
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, padding: 'var(--space-4) var(--space-5)', overflowY: 'auto', background: '#fafafa' }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--luxe-slate-400)', fontSize: 13 }}>
                      No messages yet
                    </div>
                  ) : messages.map(msg => (
                    <div key={msg.id} style={{
                      marginBottom: 'var(--space-4)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: msg.direction === 'inbound' ? 'flex-start' : 'flex-end',
                    }}>
                      <div style={{
                        maxWidth: '80%', padding: 'var(--space-3)',
                        borderRadius: msg.direction === 'inbound' ? 'var(--radius-md) var(--radius-md) var(--radius-md) 0' : 'var(--radius-md) var(--radius-md) 0 var(--radius-md)',
                        background: msg.direction === 'inbound' ? '#fff' : 'var(--luxe-blue-600)',
                        color: msg.direction === 'inbound' ? 'var(--luxe-charcoal)' : '#fff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        border: msg.direction === 'inbound' ? '1px solid var(--luxe-warm-100)' : 'none'
                      }}>
                        {msg.body}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--luxe-slate-400)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                        {fmtTime(msg.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <div style={{ padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--luxe-warm-100)', background: '#fff' }}>
                  <textarea className="luxe-input" rows={2} placeholder="Type your reply..."
                    value={replyText} onChange={e => setReplyText(e.target.value)}
                    style={{ fontSize: 13, marginBottom: 'var(--space-2)', resize: 'vertical' }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={sendReply} disabled={sending || !replyText.trim()}
                      className="luxe-btn luxe-btn-gold luxe-btn-sm">
                      {sending ? '📤 Sending...' : '📤 Reply'}
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div style={{ padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--luxe-warm-100)', display: 'flex', gap: 'var(--space-2)', background: '#fff' }}>
                  {selected.channel === 'email' && (
                    <a href={`/admin/apps/email-inbox`} className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ fontSize: 10 }}>📧 Open in Email</a>
                  )}
                  {selected.channel === 'website' && (
                    <span className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ fontSize: 10, cursor: 'default' }}>💬 Website Chat</span>
                  )}
                  {selected.channel === 'rfq' && selected.rfqRequestId && (
                    <>
                      <a href={`/admin/rfq/${selected.rfqRequestId}`} className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ fontSize: 10 }}>◐ Open RFQ Request</a>
                      <a href={`/admin/quotations/new?rfqId=${selected.rfqRequestId}`} className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ fontSize: 10, borderColor: 'var(--luxe-blue-600)' }}>◎ Create Quotation</a>
                    </>
                  )}
                  {selected.customerId && (
                    <a href={`/admin/customers/${selected.customerId}`} className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ fontSize: 10 }}>👤 Customer Profile</a>
                  )}
                </div>
              </div>

              {/* RFQ Sidebar Context Panel */}
              {selected.channel === 'rfq' && rfqDetails && (
                <div style={{ width: 340, flexShrink: 0, borderLeft: '1px solid var(--luxe-warm-200)', background: '#f9faf9', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', height: '100%' }}>
                  <div style={{ borderBottom: '1px solid var(--luxe-warm-100)', paddingBottom: 12 }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      📋 RFQ Request Details
                      <span className={`luxe-badge ${rfqDetails.status === 'new' ? 'warning' : 'success'}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                        {rfqDetails.status}
                      </span>
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--luxe-slate-500)', fontFamily: 'var(--font-mono)' }}>ID: #{rfqDetails.id}</p>
                  </div>

                  {/* Project Metadata */}
                  <div style={{ fontSize: 12, display: 'grid', gap: 8 }}>
                    {rfqDetails.project_type && (
                      <div>
                        <strong style={{ color: 'var(--luxe-slate-500)' }}>Project Type:</strong>
                        <div style={{ fontWeight: 600, color: 'var(--luxe-charcoal)', marginTop: 2 }}>{rfqDetails.project_type}</div>
                      </div>
                    )}
                    {rfqDetails.budget_range && (
                      <div>
                        <strong style={{ color: 'var(--luxe-slate-500)' }}>Budget Range:</strong>
                        <div style={{ fontWeight: 600, color: 'var(--luxe-charcoal)', marginTop: 2 }}>{rfqDetails.budget_range}</div>
                      </div>
                    )}
                    {rfqDetails.delivery_location && (
                      <div>
                        <strong style={{ color: 'var(--luxe-slate-500)' }}>Delivery Location:</strong>
                        <div style={{ fontWeight: 600, color: 'var(--luxe-charcoal)', marginTop: 2 }}>📍 {rfqDetails.delivery_location}</div>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  {rfqDetails.items && rfqDetails.items.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--luxe-warm-100)', paddingTop: 12 }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--luxe-slate-500)' }}>Items Requested ({rfqDetails.items.length})</h4>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {rfqDetails.items.map((item: any, idx: number) => (
                          <div key={idx} style={{ background: '#fff', border: '1px solid var(--luxe-warm-100)', borderRadius: 6, padding: '8px 10px', fontSize: 12 }}>
                            <div style={{ fontWeight: 600, color: 'var(--luxe-charcoal)', marginBottom: 2 }}>{item.title}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--luxe-slate-500)', fontSize: 11 }}>
                              <span>Qty: {item.quantity}</span>
                              {item.price > 0 && <span>₱{Number(item.price).toLocaleString()}</span>}
                            </div>
                            {item.notes && (
                              <div style={{ marginTop: 4, fontStyle: 'italic', color: '#8b988f', fontSize: 11, background: '#f4f6f4', padding: '3px 6px', borderRadius: 4 }}>
                                "{item.notes}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Chats Switcher */}
                  {otherConversations && otherConversations.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--luxe-warm-100)', paddingTop: 12, marginTop: 'auto' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--luxe-slate-500)' }}>Other RFQs from Customer</h4>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {otherConversations.map((other: any) => (
                          <button key={other.id}
                            onClick={() => {
                              const found = conversations.find(c => c.id === other.id)
                              if (found) {
                                fetchMessages(found)
                              } else {
                                fetchMessages({
                                  id: other.id,
                                  channel: 'rfq',
                                  contactName: selected.contactName,
                                  contactEmail: selected.contactEmail,
                                  subject: other.subject,
                                  lastMessage: '',
                                  lastMessageAt: other.lastMessageAt || new Date().toISOString(),
                                  unreadCount: 0,
                                  status: other.status || 'active',
                                  tags: ['rfq'],
                                  rfqRequestId: other.rfqRequestId
                                })
                              }
                            }}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left', background: '#fff', border: '1px solid var(--luxe-warm-100)', borderRadius: 6, padding: '8px 10px', fontSize: 11, cursor: 'pointer', transition: 'all 100ms ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--luxe-blue-400)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--luxe-warm-100)'}
                          >
                            <div style={{ fontWeight: 600, color: 'var(--luxe-charcoal)' }}>{other.subject}</div>
                            <div style={{ fontSize: 10, color: 'var(--luxe-slate-400)', marginTop: 2 }}>Last active: {fmtTime(other.lastMessageAt)}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="luxe-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa69c', flexDirection: 'column', height: '100%' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--luxe-charcoal)' }}>Select a conversation to reply</div>
              <div style={{ fontSize: 12 }}>Pick from the list on the left to start typing.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
