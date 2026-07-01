'use client'

import { useState } from 'react'
import type { RevisionAction } from './QuotationRevisionButtons'

interface SummaryAction {
  id: string
  itemIndex: number
  itemTitle: string
  actionType: string
  description: string
}

interface Props {
  actions: SummaryAction[]
  onRemove: (id: string) => void
  onClear: () => void
  onSend: (freeText: string) => void
  isSending: boolean
}

const ACTION_ICONS: Record<string, string> = {
  remove: '✕',
  change_qty: '🔢',
  change_finish: '🎨',
  swap: '🔄',
  lower_price: '💰',
  lead_time: '⏱',
}

export default function QuotationRevisionSummary({ actions, onRemove, onClear, onSend, isSending }: Props) {
  const [freeText, setFreeText] = useState('')

  if (actions.length === 0 && !freeText.trim()) return null

  return (
    <div style={{
      position: 'sticky',
      bottom: 0,
      background: '#fff',
      borderTop: '2px solid #1a6d3e',
      borderRadius: '12px 12px 0 0',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      padding: '16px 20px',
      zIndex: 20,
      marginTop: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#151a17' }}>
          🔄 Revision Summary
        </h3>
        <button
          onClick={onClear}
          style={{
            padding: '4px 10px',
            fontSize: 11,
            border: '1px solid #d9e0d7',
            borderRadius: 6,
            background: '#fff',
            cursor: 'pointer',
            color: '#667168',
          }}
        >
          Clear All
        </button>
      </div>

      {/* Structured actions */}
      {actions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {actions.map(action => (
            <div key={action.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: '#f0fdf4',
              borderRadius: 8,
              border: '1px solid #bbf7d0',
            }}>
              <span style={{ fontSize: 14 }}>{ACTION_ICONS[action.actionType] || '📝'}</span>
              <span style={{ flex: 1, fontSize: 13, color: '#151a17' }}>{action.description}</span>
              <button
                onClick={() => onRemove(action.id)}
                style={{
                  padding: '2px 6px',
                  fontSize: 12,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#e11d48',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Free text */}
      <textarea
        value={freeText}
        onChange={e => setFreeText(e.target.value)}
        placeholder="Or type your revision request here..."
        rows={2}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1.5px solid #d9e0d7',
          borderRadius: 8,
          fontSize: 13,
          fontFamily: 'inherit',
          resize: 'vertical',
          boxSizing: 'border-box',
          marginBottom: 12,
        }}
      />

      {/* Send button */}
      <button
        onClick={() => onSend(freeText)}
        disabled={isSending || (actions.length === 0 && !freeText.trim())}
        className="luxe-btn luxe-btn-primary"
        style={{
          width: '100%',
          padding: '12px',
          fontSize: 15,
          fontWeight: 700,
          opacity: isSending || (actions.length === 0 && !freeText.trim()) ? 0.5 : 1,
          cursor: isSending ? 'wait' : 'pointer',
        }}
      >
        {isSending ? 'Sending Revision Request...' : `📨 Send Revision Request (${actions.length + (freeText.trim() ? 1 : 0)} change${actions.length !== 1 ? 's' : ''})`}
      </button>
    </div>
  )
}
