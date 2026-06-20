'use client'

import { useState, useEffect, useCallback } from 'react'

interface SmartReply {
  id: string
  text: string
  icon: string
  aiGenerated?: boolean
}

interface RfqChatSmartRepliesProps {
  rfqId: string
  onSelectReply: (text: string) => void
}

export default function RfqChatSmartReplies({ rfqId, onSelectReply }: RfqChatSmartRepliesProps) {
  const [suggestions, setSuggestions] = useState<SmartReply[]>([])
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const fetchSuggestions = useCallback(async () => {
    if (dismissed) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/rfq-chat/${rfqId}/suggestions`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.suggestions?.length > 0) {
          setSuggestions(data.suggestions)
        }
      }
    } catch {
      // Silent fail — suggestions are optional
    } finally {
      setLoading(false)
    }
  }, [rfqId, dismissed])

  // Fetch on mount and every 30 seconds (when new messages arrive)
  useEffect(() => {
    fetchSuggestions()
    const interval = setInterval(fetchSuggestions, 30000)
    return () => clearInterval(interval)
  }, [fetchSuggestions])

  if (dismissed || suggestions.length === 0) return null

  return (
    <div style={{
      padding: '8px 12px',
      borderTop: '1px solid #e8e8e8',
      background: '#f8faff',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: '#667168',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {'\u{1F916}'} Smart Replies
        </span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: '#bbb', padding: 0, lineHeight: 1,
          }}
          title="Dismiss"
        >
          {'\u2715'}
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {suggestions.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              onSelectReply(s.text)
              setDismissed(true)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 16,
              fontSize: 12,
              color: '#333',
              cursor: 'pointer',
              transition: 'all 0.15s',
              maxWidth: '100%',
              whiteSpace: 'normal',
              textAlign: 'left',
              lineHeight: 1.3,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1a6d3e'
              e.currentTarget.style.background = '#f0fdf4'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0'
              e.currentTarget.style.background = '#fff'
            }}
          >
            <span style={{ fontSize: 14 }}>{s.icon}</span>
            <span>{s.text}</span>
            {s.aiGenerated && (
              <span style={{
                fontSize: 9, color: '#1a6d3e', fontWeight: 600,
                background: '#e8f5e9', padding: '1px 5px', borderRadius: 4,
              }}>
                AI
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
