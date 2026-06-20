'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import RfqChatMessageList from './RfqChatMessageList'
import RfqChatInput from './RfqChatInput'
import RfqChatTtlBanner from './RfqChatTtlBanner'
import RfqChatBackfillNotice from './RfqChatBackfillNotice'
import RfqChatProductSearch from './RfqChatProductSearch'

interface RfqChatContainerProps {
  rfqId: string
  isAdmin?: boolean
}

export default function RfqChatContainer({ rfqId, isAdmin }: RfqChatContainerProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sendError, setSendError] = useState('')
  const [sending, setSending] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const messagesEndpoint = isAdmin
    ? `/api/admin/rfq-chat/${rfqId}/messages`
    : `/api/rfq-chat/${rfqId}/messages`

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(messagesEndpoint, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch messages')
      const data = await res.json()
      setMessages(data.messages || [])
      if (data.conversationId) setConversationId(data.conversationId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [messagesEndpoint])

  useEffect(() => {
    fetchMessages()
    pollingRef.current = setInterval(fetchMessages, 10000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSendMessage(content: string) {
    if (!content.trim() || sending) return
    setSending(true)
    setSendError('')
    try {
      const res = await fetch(messagesEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: content.trim() }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to send') }
      const newMsg = await res.json()
      setMessages(prev => [...prev, newMsg])
    } catch (err: any) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleSendProduct(product: any) {
    const content = `\u{1F4E6} Product shared: ${product.title}`
    setSending(true)
    setSendError('')
    try {
      const res = await fetch(messagesEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content,
          metadata: {
            productCard: {
              id: product.id,
              title: product.title,
              price: product.price,
              imageUrl: product.imageUrl || null,
              slug: product.slug,
              categoryTitle: product.categoryTitle || null,
            },
          },
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to send') }
      const newMsg = await res.json()
      setMessages(prev => [...prev, newMsg])
      setProductSearchOpen(false)
    } catch (err: any) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  /** Admin: add product directly to RFQ items — non-blocking inline feedback */
  async function handleAddProductToRfq(productId: number | string) {
    try {
      const res = await fetch('/api/rfq/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: conversationId, productId, quantity: 1 }),
      })
      if (!res.ok) {
        const d = await res.json()
        // show inline feedback instead of alert
        setSendError(d.error || 'Could not add to RFQ')
        return
      }
      // Show brief success via a quick message
      setSendError('')
      // Optional: post a system message
      await fetch(messagesEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: '\u{2705} Product added to RFQ',
          customerVisible: true,
        }),
      }).catch(() => {})
    } catch (err: any) {
      setSendError('Could not add product: ' + err.message)
    }
  }

  const hasBackfillNotice = messages.some(
    m => m.message_type === 'system_event' && m.metadata?.eventType === 'backfill_complete'
  )
  const notificationCount = messages.filter(
    m => m.message_type === 'notification' && m.customer_visible !== false
  ).length

  // Loading skeleton
  if (loading) {
    return (
      <div style={{
        border: '1px solid #e0e0e0', borderRadius: 12, overflow: 'hidden', background: '#fff',
      }}>
        <div style={{
          padding: '16px 20px', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: '#fff',
        }}>
          <div style={{ height: 18, width: 160, background: 'rgba(255,255,255,0.15)', borderRadius: 4 }} />
        </div>
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 48, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
              backgroundSize: '200% 100%', borderRadius: 8,
              animation: 'shimmer 1.5s infinite',
              width: `${60 + i * 15}%`, alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start',
            }} />
          ))}
        </div>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden', background: '#fff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Header — dark gradient */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#4ade80',
            display: 'inline-block',
          }} />
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: 0.3 }}>
            Messages & Timeline
          </span>
          {notificationCount > 0 && (
            <span style={{
              background: '#4ade80', color: '#1a1a2e', fontSize: 11, fontWeight: 700,
              padding: '2px 8px', borderRadius: 10,
            }}>
              {notificationCount} new
            </span>
          )}
        </div>
        {!isAdmin && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          margin: '8px 12px 0', padding: '8px 12px', background: '#fef2f2', color: '#dc2626',
          borderRadius: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{error}</span>
          <button onClick={() => { setError(''); fetchMessages() }}
            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Retry
          </button>
        </div>
      )}
      {sendError && (
        <div style={{
          margin: '8px 12px 0', padding: '8px 12px', background: '#fff7ed', color: '#9a3412',
          borderRadius: 8, fontSize: 12,
        }}>
          {sendError}
        </div>
      )}

      {hasBackfillNotice && <RfqChatBackfillNotice />}

      {/* Messages area */}
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            padding: '40px 20px', color: '#999',
          }}>
            <span style={{ fontSize: 40 }}>{'\u{1F4E8}'}</span>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#555' }}>No messages yet</div>
            <div style={{ fontSize: 13, color: '#999', textAlign: 'center', maxWidth: 280 }}>
              Start the conversation. Share a product or send a message to get started.
            </div>
            <button
              onClick={() => setProductSearchOpen(true)}
              style={{
                marginTop: 4, padding: '8px 20px', background: '#1a1a2e', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {'\u{1F50D}'} Browse Products
            </button>
          </div>
        ) : (
          <RfqChatMessageList
            messages={messages}
            isAdmin={isAdmin}
            onAddProductToRfq={isAdmin ? handleAddProductToRfq : undefined}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isAdmin && <RfqChatTtlBanner />}

      {/* Product search */}
      <RfqChatProductSearch
        open={productSearchOpen}
        onClose={() => setProductSearchOpen(false)}
        onSelectProduct={handleSendProduct}
      />

      {/* Input area */}
      <div style={{ borderTop: '1px solid #e8e8e8', background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 14px 0' }}>
          <button
            onClick={() => setProductSearchOpen(!productSearchOpen)}
            title="Search and share products"
            style={{
              padding: '5px 8px', background: 'transparent', border: 'none', borderRadius: 6,
              cursor: 'pointer', fontSize: 15, color: productSearchOpen ? '#1a6d3e' : '#888',
              transition: 'color 0.15s',
            }}
          >
            {'\u{1F50D}'}
          </button>
          <span style={{ fontSize: 11, color: '#bbb' }}>
            {productSearchOpen ? 'Click a product to share' : 'Share a product'}
          </span>
        </div>
        <RfqChatInput onSend={handleSendMessage} disabled={sending} />
      </div>
    </div>
  )
}
