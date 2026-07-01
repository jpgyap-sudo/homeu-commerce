'use client'

import { useState, useEffect, useRef } from 'react'

interface ChatMessage {
  id: number
  senderType: 'customer' | 'admin' | 'system'
  message: string
  createdAt: string
}

interface Props {
  quotationId: string | number
  isAdmin?: boolean
  token?: string
}

export default function QuotationRevisionChat({ quotationId, isAdmin, token }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const endpoint = isAdmin
      ? `/api/admin/quotations/${quotationId}/chat`
      : `/api/quotations/${quotationId}/chat${token ? `?token=${encodeURIComponent(token)}` : ''}`
    fetch(endpoint)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data)
      })
      .catch(() => {})
  }, [quotationId, isAdmin, token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!newMessage.trim() || sending) return
    setSending(true)
    try {
      const endpoint = isAdmin
        ? `/api/admin/quotations/${quotationId}/chat`
        : `/api/quotations/${quotationId}/chat${token ? `?token=${encodeURIComponent(token)}` : ''}`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data])
        setNewMessage('')
      }
    } catch {}
    setSending(false)
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const SENDER_LABELS: Record<string, string> = {
    admin: isAdmin ? 'You' : 'HomeU Team',
    customer: isAdmin ? 'Customer' : 'You',
    system: 'System',
  }

  const SENDER_COLORS: Record<string, string> = {
    admin: '#1a6d3e',
    customer: '#2563eb',
    system: '#667168',
  }

  return (
    <div style={{ border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          borderBottom: collapsed ? 'none' : '1px solid #d9e0d7',
          background: '#fafbf9',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: '#151a17',
        }}
      >
        <span>💬 Revision Chat ({messages.length})</span>
        <span style={{ fontSize: 12, color: '#667168', transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>▼</span>
      </button>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Messages */}
          <div style={{ maxHeight: 300, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#667168', fontSize: 12, padding: 20 }}>
                No messages yet. Revision updates will appear here.
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.senderType === 'customer' ? 'flex-start' : 'flex-end',
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '8px 12px',
                  borderRadius: msg.senderType === 'customer' ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
                  background: msg.senderType === 'system' ? '#f5f5f5' : msg.senderType === 'admin' ? '#f0fdf4' : '#eff6ff',
                  border: `1px solid ${msg.senderType === 'system' ? '#e5e5e5' : msg.senderType === 'admin' ? '#bbf7d0' : '#bfdbfe'}`,
                }}>
                  {msg.senderType !== 'system' && (
                    <div style={{ fontSize: 10, fontWeight: 600, color: SENDER_COLORS[msg.senderType], marginBottom: 2 }}>
                      {SENDER_LABELS[msg.senderType]}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: '#151a17', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                  <div style={{ fontSize: 9, color: '#667168', marginTop: 4, textAlign: 'right' }}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #d9e0d7', display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder={isAdmin ? 'Reply to customer...' : 'Ask a question about this quotation...'}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1.5px solid #d9e0d7',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={sending || !newMessage.trim()}
              className="luxe-btn luxe-btn-primary"
              style={{ padding: '8px 16px', opacity: sending || !newMessage.trim() ? 0.5 : 1 }}
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
