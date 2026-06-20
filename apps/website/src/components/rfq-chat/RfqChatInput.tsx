'use client'

import { useRef } from 'react'

interface RfqChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function RfqChatInput({
  onSend,
  disabled,
  placeholder = 'Type your message...',
}: RfqChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = textareaRef.current
    if (input && input.value.trim()) {
      onSend(input.value.trim())
      input.value = ''
      input.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) form.requestSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex',
      gap: 8,
      padding: '10px 16px',
      background: '#fafafa',
    }}>
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        rows={1}
        style={{
          flex: 1,
          padding: '10px 14px',
          border: '1.5px solid #d9e0d7',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: 'inherit',
          resize: 'none',
          outline: 'none',
          background: '#fff',
          minHeight: 42,
        }}
      />
      <button
        type="submit"
        disabled={disabled}
        style={{
          padding: '10px 20px',
          background: disabled ? '#999' : '#222',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          alignSelf: 'flex-end',
        }}
      >
        {disabled ? 'Sending...' : 'Send'}
      </button>
    </form>
  )
}
