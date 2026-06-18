'use client'

interface ViberHandoffProps {
  viberNumber: string
  viberName: string
  onSendRFQ: () => void
  onClose: () => void
}

export function ViberHandoff({ viberNumber, viberName, onSendRFQ, onClose }: ViberHandoffProps) {
  return (
    <div className="chat-viber-card">
      <h4>Contact Sales on Viber</h4>
      <p>For faster quotation or showroom appointment, you may contact our sales representative:</p>
      <p className="chat-viber-number">
        {viberName} —{' '}
        <a href={`viber://chat?number=${viberNumber.replace(/[^0-9+]/g, '')}`}
           style={{ color: '#7367F0', textDecoration: 'none', fontWeight: 700 }}>
          {viberNumber}
        </a>
      </p>
      <p style={{ fontSize: 12, color: '#67706a', margin: '8px 0 12px' }}>
        You can also send your RFQ details to our sales team so they can prepare a quotation before you call.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="chat-submit-btn" onClick={onSendRFQ} style={{ flex: 1, fontSize: 13 }}>
          Send RFQ to Sales
        </button>
        <button className="chat-submit-btn" onClick={onClose}
          style={{ flex: 1, fontSize: 13, background: 'transparent', color: '#173f2f', border: '1px solid #dfd8ce' }}>
          Close
        </button>
      </div>
    </div>
  )
}
