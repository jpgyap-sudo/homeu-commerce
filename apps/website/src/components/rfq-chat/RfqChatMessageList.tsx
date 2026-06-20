'use client'

import RfqChatMessageBubble from './RfqChatMessageBubble'

interface RfqChatMessageListProps {
  messages: any[]
  isAdmin?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  selectMode?: boolean
  onAddProductToRfq?: (productId: number | string) => void
}

export default function RfqChatMessageList({
  messages,
  isAdmin,
  selectedIds,
  onToggleSelect,
  selectMode,
  onAddProductToRfq,
}: RfqChatMessageListProps) {
  // Group messages by date
  const groups: Record<string, any[]> = {}
  for (const msg of messages) {
    const date = new Date(msg.created_at || msg.createdAt).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
  }

  return (
    <div>
      {Object.entries(groups).map(([date, msgs]) => (
        <div key={date}>
          {/* Date separator */}
          <div style={{
            textAlign: 'center',
            margin: '16px 0 8px',
            fontSize: 11,
            color: '#999',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {date}
          </div>

          {/* Messages */}
          {msgs.map((msg) => (
            <RfqChatMessageBubble
              key={msg.id}
              message={msg}
              isAdmin={isAdmin}
              selected={selectedIds?.has(msg.id)}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(msg.id) : undefined}
              selectMode={selectMode}
              onAddProductToRfq={onAddProductToRfq}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
