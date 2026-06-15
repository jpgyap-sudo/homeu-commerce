'use client'

import { useEffect, useRef } from 'react'

export interface ChatMessage {
  id: string
  sender: 'visitor' | 'bot' | 'system'
  content: string
  type: 'text' | 'product_card' | 'image' | 'viber' | 'system'
  timestamp: Date
  metadata?: Record<string, unknown>
}

interface MessageListProps {
  messages: ChatMessage[]
  isTyping: boolean
}

export function MessageList({ messages, isTyping }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  }

  if (messages.length === 0 && !isTyping) return null

  return (
    <div className="chat-messages">
      {messages.map(msg => (
        <div key={msg.id}>
          {msg.type === 'system' ? (
            <div className="chat-message chat-message-system">
              {msg.content}
              <div className="chat-timestamp">{formatTime(msg.timestamp)}</div>
            </div>
          ) : (
            <div className={`chat-message ${msg.sender === 'visitor' ? 'chat-message-visitor' : 'chat-message-bot'}`}>
              <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br>') }} />
              <div className="chat-timestamp">{formatTime(msg.timestamp)}</div>
            </div>
          )}
        </div>
      ))}

      {isTyping && (
        <div className="chat-typing">
          <span className="chat-typing-dot" />
          <span className="chat-typing-dot" />
          <span className="chat-typing-dot" />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
