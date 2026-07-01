'use client'

import RfqChatProductCard from './RfqChatProductCard'

interface RfqChatMessageBubbleProps {
  message: any
  isAdmin?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  selectMode?: boolean
  onAddProductToRfq?: (product: any) => void
  onAskProductQuestion?: (product: any, question: string) => void
}

const SENDER_ICONS: Record<string, string> = {
  customer: '\u{1F464}',
  admin: '\u{1F6E0}\uFE0F',
  system: '\u{1F916}',
  ai_bot: '\u{1F916}',
}

const SENDER_LABELS: Record<string, string> = {
  customer: 'You',
  admin: 'Admin',
  system: 'HomeU',
  ai_bot: 'Chatbot',
}

export default function RfqChatMessageBubble({
  message,
  isAdmin,
  selected,
  onToggleSelect,
  selectMode,
  onAddProductToRfq,
  onAskProductQuestion,
}: RfqChatMessageBubbleProps) {
  const senderType = message.sender_type || 'customer'
  const isSystem = senderType === 'system'
  const isNotification = message.message_type === 'notification'
  const isDeleted = message.is_deleted || message.deleted_at
  const isVisible = message.customer_visible !== false
  const productCard = message.metadata?.productCard

  // Deleted message
  if (isDeleted) {
    return (
      <div style={{
        padding: '8px 12px', margin: '4px 12px',
        background: '#f5f5f5', borderRadius: 6,
        fontSize: 12, color: '#999', fontStyle: 'italic', textAlign: 'center',
      }}>
        {'\u{1F5D1}\uFE0F'} Message deleted
      </div>
    )
  }

  // System / notification events
  if (isSystem || isNotification) {
    const isBackfill = message.metadata?.eventType === 'backfill_complete'
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '6px 12px', margin: '4px 0' }}>
        {selectMode && isAdmin && (
          <input type="checkbox" checked={selected} onChange={onToggleSelect} style={{ margin: 0, cursor: 'pointer' }} disabled />
        )}
        <div style={{
          background: isNotification ? '#e8f5e9' : '#f0f0f0', borderRadius: 8,
          padding: '8px 16px', fontSize: 12, color: isNotification ? '#2e7d32' : '#666',
          textAlign: 'center', maxWidth: '80%',
        }}>
          {isNotification && <span style={{ marginRight: 4 }}>{'\u{1F514}'}</span>}
          {message.content}
          {message.metadata?.quotationNumber && (
            <a href={`/customer/quotation/${message.metadata?.quotationId}`}
              style={{ display: 'inline-block', marginLeft: 8, padding: '2px 10px', background: '#1a6d3e', color: '#fff', borderRadius: 4, textDecoration: 'none', fontSize: 11, fontWeight: 600 }}>
              View
            </a>
          )}
          {isBackfill && <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>Imported from chatbot conversation</div>}
        </div>
      </div>
    )
  }

  // Regular messages
  const isCustomer = senderType === 'customer'
  const isBot = senderType === 'ai_bot'
  const isAdminMsg = senderType === 'admin'
  const adminName = isAdminMsg ? (message.adminName || 'Admin') : ''
  const bgColor = isAdminMsg ? '#e3f2fd' : isBot ? '#f3e5f5' : '#f5f5f5'
  const showInternalTag = isAdmin && !isVisible

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0',
      flexDirection: isAdminMsg ? 'row-reverse' : 'row',
      opacity: isVisible ? 1 : 0.6,
    }}>
      {/* Select checkbox */}
      {selectMode && isAdmin && !isSystem && (
        <input type="checkbox" checked={selected} onChange={onToggleSelect}
          style={{ marginTop: 6, cursor: 'pointer' }} />
      )}

      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: isAdminMsg ? '#e3f2fd' : '#f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, flexShrink: 0,
      }}>
        {SENDER_ICONS[senderType] || '\u{1F4AC}'}
      </div>

      {/* Message content */}
      <div style={{ maxWidth: '75%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, fontSize: 11, color: '#888' }}>
          <span style={{ fontWeight: 600 }}>
            {isAdminMsg ? adminName : isCustomer ? 'You' : SENDER_LABELS[senderType] || senderType}
          </span>
          {showInternalTag && (
            <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
              INTERNAL
            </span>
          )}
          <span>{formatTime(message.created_at || message.createdAt)}</span>
        </div>

        {/* Message text */}
        {!productCard && (
          <div style={{
            background: bgColor, borderRadius: 12,
            borderTopLeftRadius: isAdminMsg ? 12 : 4,
            borderTopRightRadius: isAdminMsg ? 4 : 12,
            padding: '8px 14px', fontSize: 14, color: '#333',
            lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {message.content}
          </div>
        )}

        {/* Product card */}
        {productCard && (
          <RfqChatProductCard
            product={productCard}
            showAddToCart
            addMode={isAdmin ? 'server-rfq' : 'local-cart'}
            onAddToCart={onAddProductToRfq}
            onAskQuestion={!isAdmin ? onAskProductQuestion : undefined}
          />
        )}

        {/* Backfill badge */}
        {message.metadata?.backfilledFrom === 'chatbot' && (
          <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
            {'\u{1F4CB}'} From chatbot
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
