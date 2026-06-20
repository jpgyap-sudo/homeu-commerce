'use client'

export default function RfqChatBackfillNotice() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      margin: '4px 12px',
      background: '#f0f7ff',
      borderRadius: 8,
      border: '1px solid #d0e3f7',
      fontSize: 12,
      color: '#1a56db',
    }}>
      <span style={{ fontSize: 16 }}>🔄</span>
      <span>Previous chat history imported</span>
    </div>
  )
}
