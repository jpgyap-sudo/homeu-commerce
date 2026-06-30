'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import siteConfig from '@/data/site-config.json'
import RfqChatMessageList from './RfqChatMessageList'
import RfqChatInput from './RfqChatInput'
import RfqChatSelectToolbar from './RfqChatSelectToolbar'
import RfqChatDeleteModal from './RfqChatDeleteModal'
import RfqChatNotifyButton from './RfqChatNotifyButton'
import RfqChatProductSearch from './RfqChatProductSearch'
import RfqChatSmartReplies from './RfqChatSmartReplies'

const LOGO_URL = siteConfig.logo?.shopifyUrl || ''
const LOGO_ALT = siteConfig.name || 'HomeU'

interface RfqChatAdminContainerProps {
  rfqId: string
  customerEmail?: string
}

export default function RfqChatAdminContainer({ rfqId, customerEmail }: RfqChatAdminContainerProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [conversation, setConversation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const shouldScrollMessagesRef = useRef(false)

  // Selection / deletion state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletionRequestId, setDeletionRequestId] = useState<string | null>(null)
  const [productSearchOpen, setProductSearchOpen] = useState(false)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/rfq-chat/${rfqId}/messages`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch messages')
      const data = await res.json()
      setMessages(data.messages || [])
      setConversation(data.conversation)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [rfqId])

  useEffect(() => {
    fetchMessages()
    pollingRef.current = setInterval(fetchMessages, 10000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [fetchMessages])

  useEffect(() => {
    if (!shouldScrollMessagesRef.current) return
    shouldScrollMessagesRef.current = false

    const scrollEl = messagesScrollRef.current
    if (!scrollEl) return

    requestAnimationFrame(() => {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' })
    })
  }, [messages])

  async function handleSendMessage(content: string) {
    if (!content.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/rfq-chat/${rfqId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: content.trim() }),
      })
      if (!res.ok) throw new Error('Failed to send')
      const newMsg = await res.json()
      shouldScrollMessagesRef.current = true
      setMessages((prev) => [...prev, newMsg])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  /** Send a product card as a message */
  async function handleSendProduct(product: any) {
    const content = `\u{1F4E6} Product shared: ${product.title}`
    setSending(true)
    try {
      const res = await fetch(`/api/admin/rfq-chat/${rfqId}/messages`, {
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
      if (!res.ok) throw new Error('Failed to send')
      const newMsg = await res.json()
      shouldScrollMessagesRef.current = true
      setMessages(prev => [...prev, newMsg])
      setProductSearchOpen(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  /** Add product directly to RFQ items */
  async function handleAddProductToRfq(productId: number | string) {
    try {
      const res = await fetch('/api/rfq/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: 'admin', productId, quantity: 1 }),
      })
      if (!res.ok) throw new Error('Failed to add')
      shouldScrollMessagesRef.current = true
      // Insert system event
      await fetch(`/api/admin/rfq-chat/${rfqId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: `\u{1F4E6} Product added to RFQ`,
          customerVisible: true,
        }),
      }).catch(() => {})
    } catch (err: any) {
      setError('Failed to add product: ' + err.message)
    }
  }

  // Selection handlers
  function handleToggleSelectMode() {
    setSelectMode(!selectMode)
    setSelectedIds(new Set())
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAll() {
    // Only select non-system messages (system events/notifications are protected)
    const deletable = messages.filter(
      (m) => m.message_type !== 'system_event' && m.message_type !== 'notification' && !m.is_deleted
    )
    setSelectedIds(new Set(deletable.map((m) => m.id)))
  }

  function handleDeselectAll() {
    setSelectedIds(new Set())
  }

  async function handleDeleteClick() {
    if (selectedIds.size === 0) return
    setDeleting(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/rfq-chat/${rfqId}/messages/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'select',
          messageIds: Array.from(selectedIds),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to initiate deletion')
      }

      const data = await res.json()
      setDeletionRequestId(data.deletionRequestId)
      setDeleteModalOpen(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  async function handleConfirmDelete(otpCode: string): Promise<boolean> {
    if (!deletionRequestId) return false

    const res = await fetch(`/api/admin/rfq-chat/${rfqId}/messages/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'confirm',
        deletionRequestId,
        otpCode,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to delete messages')
    }

    // Refresh messages and exit select mode
    setSelectMode(false)
    setSelectedIds(new Set())
    await fetchMessages()
    return true
  }

  const deletableCount = messages.filter(
    (m) => m.message_type !== 'system_event' && m.message_type !== 'notification' && !m.is_deleted
  ).length

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: 10,
      overflow: 'hidden',
      background: '#fff',
    }}>
      {/* Header — animated green dot + logo, both 1.5x */}
      <div style={{
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Animated green dot — 1.5x bigger */}
          <span style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#4ade80',
            display: 'inline-block',
            animation: 'pulse-dot 2s ease-in-out infinite',
            boxShadow: '0 0 6px rgba(74,222,128,0.5)',
            flexShrink: 0,
          }} />
          {/* Logo image — 1.5x */}
          {LOGO_URL ? (
            <img
              src={LOGO_URL}
              alt={LOGO_ALT}
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <span style={{ fontWeight: 600, fontSize: 15, color: '#fff', letterSpacing: 0.3 }}>
              Home Atelier
            </span>
          )}
          {conversation && (
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 4 }}>
              {conversation.messageCount} msg
            </span>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.15); } }`}</style>

      {/* Error */}
      {error && (
        <div style={{
          margin: '8px 12px',
          padding: '8px 12px',
          background: '#fef2f2',
          color: '#dc2626',
          borderRadius: 6,
          fontSize: 13,
        }}>
          {error}
          <button onClick={() => { setError(''); fetchMessages() }}
            style={{ marginLeft: 8, background: 'none', border: 'none', color: '#dc2626', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>
            Retry
          </button>
        </div>
      )}

      {/* Select toolbar */}
      <RfqChatSelectToolbar
        selectedCount={selectedIds.size}
        totalCount={deletableCount}
        selectMode={selectMode}
        onToggleSelectMode={handleToggleSelectMode}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onDelete={handleDeleteClick}
        deleting={deleting}
      />

      {/* Messages */}
      <div ref={messagesScrollRef} style={{ maxHeight: 400, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>No messages yet.</div>
        ) : (
          <RfqChatMessageList
            messages={messages}
            isAdmin={true}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            selectMode={selectMode}
            onAddProductToRfq={handleAddProductToRfq}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Smart Reply Suggestions */}
      <RfqChatSmartReplies rfqId={rfqId} onSelectReply={(text) => {
        // Pre-fill input with the suggestion — user can edit or send
        setSending(false) // ensure not in sending state
        handleSendMessage(text)
      }} />

      {/* Product search panel */}
      <RfqChatProductSearch
        open={productSearchOpen}
        onClose={() => setProductSearchOpen(false)}
        onSelectProduct={handleSendProduct}
      />

      {/* Input with search toggle */}
      <div style={{ borderTop: '1px solid #e0e0e0', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 16px 0' }}>
          <button
            onClick={() => setProductSearchOpen(!productSearchOpen)}
            title="Search and share products"
            style={{
              padding: '6px 10px',
              background: productSearchOpen ? '#e8f5e9' : 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 16,
              color: productSearchOpen ? '#2e7d32' : '#666',
            }}
          >
            {'\u{1F50D}'}
          </button>
          <span style={{ fontSize: 11, color: '#999' }}>
            {productSearchOpen ? 'Click a product to share' : 'Search & share products'}
          </span>
        </div>
        <RfqChatInput onSend={handleSendMessage} disabled={sending} />
      </div>

      {/* Notify customer button */}
      <RfqChatNotifyButton rfqId={rfqId} customerEmail={customerEmail} />

      {/* Delete confirmation modal */}
      <RfqChatDeleteModal
        open={deleteModalOpen}
        messageCount={selectedIds.size}
        deletionRequestId={deletionRequestId}
        onClose={() => {
          setDeleteModalOpen(false)
          setDeletionRequestId(null)
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
