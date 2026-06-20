'use client'

import { useState } from 'react'

interface RfqChatNotifyButtonProps {
  rfqId: string
  customerEmail?: string
}

export default function RfqChatNotifyButton({ rfqId, customerEmail }: RfqChatNotifyButtonProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [notificationLog, setNotificationLog] = useState<any[]>([])
  const [showLog, setShowLog] = useState(false)
  const [lastSentInfo, setLastSentInfo] = useState<string | null>(null)

  async function handleNotify() {
    if (sending) return
    setSending(true)
    setError('')
    setSent(false)

    try {
      const res = await fetch(`/api/admin/rfq-chat/${rfqId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send notification')
      }

      const data = await res.json()
      setSent(true)
      setLastSentInfo(`Sent to ${data.emailSentTo}`)
      setTimeout(() => setSent(false), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function loadNotificationLog() {
    if (showLog) {
      setShowLog(false)
      return
    }

    try {
      const res = await fetch(`/api/admin/rfq-chat/${rfqId}/notify`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setNotificationLog(data.logs || [])
      }
    } catch {
      // Silent fail
    }
    setShowLog(true)
  }

  return (
    <div style={{
      background: '#f9f9f9',
      border: '1px solid #eee',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
          🔔 Notify Customer
        </h3>
        <button
          onClick={loadNotificationLog}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {showLog ? 'Hide history' : 'History'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={handleNotify}
          disabled={sending}
          style={{
            padding: '10px 24px',
            background: sending ? '#999' : '#1a6d3e',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: sending ? 'not-allowed' : 'pointer',
          }}
        >
          {sending ? 'Sending...' : 'Send Notification'}
        </button>

        {sent && (
          <span style={{ color: '#1a6d3e', fontSize: 13, fontWeight: 500 }}>
            ✅ {lastSentInfo || 'Sent!'}
          </span>
        )}
      </div>

      {customerEmail && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
          Email: {customerEmail}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 8,
          padding: '6px 10px',
          background: '#fef2f2',
          color: '#dc2626',
          borderRadius: 4,
          fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {/* Notification log */}
      {showLog && notificationLog.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Sent Notifications:</div>
          {notificationLog.map((log: any) => (
            <div key={log.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#888',
              padding: '4px 0',
              borderBottom: '1px solid #f0f0f0',
            }}>
              <span>
                {log.notification_type === 'admin_notify' ? '📨 Manual' : '📄 Auto'}
                {' → '}{log.email_sent_to}
              </span>
              <span>
                {new Date(log.created_at).toLocaleDateString('en-PH', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      {showLog && notificationLog.length === 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
          No notifications sent yet.
        </div>
      )}
    </div>
  )
}
