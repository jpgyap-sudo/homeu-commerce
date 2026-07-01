'use client'

import { useState } from 'react'

export type RevisionActionType = 'remove' | 'change_qty' | 'change_finish' | 'swap' | 'lower_price' | 'lead_time'

export interface RevisionAction {
  itemIndex: number
  actionType: RevisionActionType
  payload: Record<string, any>
}

interface Props {
  itemIndex: number
  itemTitle: string
  onAction: (action: RevisionAction) => void
  disabled?: boolean
}

const btnBase: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 10,
  fontWeight: 600,
  border: '1px solid #d9e0d7',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  transition: 'all 0.15s',
  whiteSpace: 'nowrap',
}

export default function QuotationRevisionButtons({ itemIndex, itemTitle, onAction, disabled }: Props) {
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [qtyValue, setQtyValue] = useState('')
  const [finishValue, setFinishValue] = useState('')

  function fire(actionType: RevisionActionType, payload: Record<string, any> = {}) {
    if (disabled) return
    onAction({ itemIndex, actionType, payload })
  }

  if (activeAction === 'change_qty') {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: '#667168' }}>New qty:</span>
        <input
          type="number"
          min={0}
          max={999}
          value={qtyValue}
          onChange={e => setQtyValue(e.target.value)}
          style={{ width: 60, padding: '3px 6px', border: '1px solid #d9e0d7', borderRadius: 4, fontSize: 12 }}
          autoFocus
        />
        <button
          onClick={() => { fire('change_qty', { newQty: parseInt(qtyValue) || 0 }); setActiveAction(null); setQtyValue('') }}
          style={{ ...btnBase, background: '#1a6d3e', color: '#fff', borderColor: '#1a6d3e' }}
        >
          Apply
        </button>
        <button onClick={() => setActiveAction(null)} style={{ ...btnBase }}>Cancel</button>
      </div>
    )
  }

  if (activeAction === 'change_finish') {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: '#667168' }}>New finish/color:</span>
        <input
          type="text"
          value={finishValue}
          onChange={e => setFinishValue(e.target.value)}
          placeholder="e.g. beige fabric"
          style={{ width: 140, padding: '3px 6px', border: '1px solid #d9e0d7', borderRadius: 4, fontSize: 12 }}
          autoFocus
        />
        <button
          onClick={() => { fire('change_finish', { finish: finishValue.trim() }); setActiveAction(null); setFinishValue('') }}
          style={{ ...btnBase, background: '#1a6d3e', color: '#fff', borderColor: '#1a6d3e' }}
        >
          Apply
        </button>
        <button onClick={() => setActiveAction(null)} style={{ ...btnBase }}>Cancel</button>
      </div>
    )
  }

  const BUTTONS: Array<{ key: string; label: string; icon: string; action: RevisionActionType; hint: string }> = [
    { key: 'remove', label: 'Remove', icon: '✕', action: 'remove', hint: `Remove ${itemTitle}` },
    { key: 'qty', label: 'Change Qty', icon: '🔢', action: 'change_qty', hint: `Change quantity for ${itemTitle}` },
    { key: 'finish', label: 'Change Finish', icon: '🎨', action: 'change_finish', hint: `Change color/finish for ${itemTitle}` },
    { key: 'price', label: 'Lower Price', icon: '💰', action: 'lower_price', hint: `Request lower price for ${itemTitle}` },
    { key: 'lead', label: 'Lead Time', icon: '⏱', action: 'lead_time', hint: `Ask about lead time for ${itemTitle}` },
  ]

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
      {BUTTONS.map(btn => (
        <button
          key={btn.key}
          onClick={() => {
            if (btn.action === 'change_qty') { setActiveAction('change_qty'); return }
            if (btn.action === 'change_finish') { setActiveAction('change_finish'); return }
            fire(btn.action)
          }}
          disabled={disabled}
          title={btn.hint}
          style={{
            ...btnBase,
            opacity: disabled ? 0.4 : 1,
            ...(btn.action === 'remove' ? { color: '#e11d48', borderColor: '#fecaca' } : { color: '#3a4339' }),
          }}
          onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#f0fdf4' }}
          onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = '#fff' }}
        >
          {btn.icon} {btn.label}
        </button>
      ))}
    </div>
  )
}
