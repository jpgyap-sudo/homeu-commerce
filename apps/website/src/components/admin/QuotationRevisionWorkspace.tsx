'use client'

import { useState, useEffect, useMemo } from 'react'
import { parseRevisionText, matchChangesToItems, type DetectedChange } from '@/lib/quotation-text-parser'
import QuotationRevisionChat from '@/components/QuotationRevisionChat'

interface QuotationItem {
  id?: string
  itemNumber?: number
  title: string
  sku?: string
  description?: string
  quantity: number
  unitCost: number
  discountPercent: number
  total: number
}

interface Props {
  quotationId: string | number
  items: QuotationItem[]
  revisionRequest: string
  onResolve: (updatedItems: QuotationItem[], message: string) => Promise<void>
  onReject: () => void
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d9e0d7',
  borderRadius: 12,
  marginBottom: 14,
  overflow: 'hidden',
}

const sectionHeader: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 13,
  fontWeight: 700,
  color: '#151a17',
  borderBottom: '1px solid #d9e0d7',
  background: '#fafbf9',
}

export default function QuotationRevisionWorkspace({ quotationId, items, revisionRequest, onResolve, onReject }: Props) {
  const [workingItems, setWorkingItems] = useState<QuotationItem[]>(items)
  const [resolving, setResolving] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [showParsed, setShowParsed] = useState(false)

  // Parse revision text into detected changes and match to items
  const parsedChanges = useMemo(() => {
    if (!revisionRequest) return []
    const changes = parseRevisionText(revisionRequest)
    return matchChangesToItems(changes, workingItems)
  }, [revisionRequest, workingItems])

  // Apply a detected change to working items
  function applyChange(change: DetectedChange, itemIndex: number) {
    setWorkingItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item

      switch (change.type) {
        case 'remove':
          return { ...item, quantity: 0, total: 0 }
        case 'change_qty': {
          const newQty = typeof change.value === 'number' ? change.value : 1
          const unitCost = item.unitCost || item.total / (item.quantity || 1)
          return { ...item, quantity: newQty, total: Math.round(unitCost * newQty * 100) / 100 }
        }
        case 'change_finish':
          return { ...item, description: `${item.description || item.title} (${change.value || 'custom finish'})` }
        case 'lower_price': {
          const reduction = typeof change.value === 'number' ? Number(change.value) : 0.9
          const factor = reduction > 0 && reduction < 1 ? reduction : 0.9
          const newUnit = Math.round(item.unitCost * factor * 100) / 100
          return { ...item, unitCost: newUnit, total: Math.round(newUnit * item.quantity * 100) / 100 }
        }
        default:
          return item
      }
    }))
  }

  // Manually edit an item
  function updateItem(index: number, field: string, value: any) {
    setWorkingItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      // Recalculate total if qty or cost changed
      if (field === 'quantity' || field === 'unitCost') {
        const qty = field === 'quantity' ? Number(value) : item.quantity
        const cost = field === 'unitCost' ? Number(value) : item.unitCost
        updated.total = Math.round(qty * cost * 100) / 100
      }
      return updated
    }))
  }

  async function handleResolve() {
    setResolving(true)
    try {
      // Filter out removed items (qty = 0)
      const finalItems = workingItems.filter(item => item.quantity > 0)
      await onResolve(finalItems, adminNote)
    } catch {}
    setResolving(false)
  }

  const activeItems = workingItems.filter(item => item.quantity > 0)
  const removedItems = workingItems.filter(item => item.quantity === 0)
  const totalQuoted = activeItems.reduce((sum, item) => sum + item.total, 0)

  return (
    <div style={card}>
      <div style={{ ...sectionHeader, background: '#fefce8', borderBottom: '2px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>🔄</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#854d0e' }}>Revision Request Pending</div>
          <div style={{ fontSize: 11, color: '#a16207', fontWeight: 400 }}>Customer has requested changes to this quotation</div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* ── Customer Request ──────────────────────────────────────────── */}
        <div style={{ padding: '12px 16px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#854d0e', marginBottom: 4 }}>Customer wrote:</div>
          <div style={{ fontSize: 13, color: '#151a17', whiteSpace: 'pre-wrap' }}>{revisionRequest || 'No message provided'}</div>

          {parsedChanges.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setShowParsed(!showParsed)}
                style={{ padding: '4px 10px', fontSize: 11, border: '1px solid #fde68a', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#854d0e' }}
              >
                {showParsed ? 'Hide' : 'Show'} Auto-Detected Changes
              </button>

              {showParsed && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {parsedChanges.map((pc, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fff', borderRadius: 6, border: '1px solid #e5e5e5' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1a6d3e' }}>{pc.change.type.replace('_', ' ')}</span>
                      <span style={{ fontSize: 12, color: '#667168' }}>→</span>
                      <span style={{ fontSize: 12, color: '#151a17' }}>{workingItems[pc.itemIndex]?.title || workingItems[pc.itemIndex]?.description || pc.change.keyword}</span>
                      {pc.change.value && <span style={{ fontSize: 12, color: '#667168' }}>({String(pc.change.value)})</span>}
                      <span style={{ fontSize: 10, color: '#667168', marginLeft: 'auto' }}>
                        {Math.round(pc.matchConfidence * 100)}% match
                      </span>
                      <button
                        onClick={() => applyChange(pc.change, pc.itemIndex)}
                        style={{ padding: '2px 8px', fontSize: 10, border: '1px solid #1a6d3e', borderRadius: 4, background: '#f0fdf4', cursor: 'pointer', color: '#1a6d3e', fontWeight: 600 }}
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Items Editor ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#151a17', marginBottom: 8 }}>Current Quotation Items</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #d9e0d7' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: '#667168', fontWeight: 600 }}>Item</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: '#667168', fontWeight: 600, width: 60 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: '#667168', fontWeight: 600, width: 80 }}>Unit Cost</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: '#667168', fontWeight: 600, width: 80 }}>Total</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: '#667168', fontWeight: 600, width: 50 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {workingItems.map((item, i) => (
                <tr key={i} style={{
                  borderBottom: '1px solid #e5e5e5',
                  background: item.quantity === 0 ? '#fef2f2' : 'transparent',
                  textDecoration: item.quantity === 0 ? 'line-through' : 'none',
                  opacity: item.quantity === 0 ? 0.6 : 1,
                }}>
                  <td style={{ padding: '8px 10px', color: '#151a17' }}>{item.title || item.description}</td>
                  <td style={{ padding: '4px', textAlign: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 0)}
                      style={{ width: 50, padding: '4px 6px', border: '1px solid #d9e0d7', borderRadius: 4, fontSize: 12, textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '4px', textAlign: 'right' }}>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitCost}
                      onChange={e => updateItem(i, 'unitCost', parseFloat(e.target.value) || 0)}
                      style={{ width: 70, padding: '4px 6px', border: '1px solid #d9e0d7', borderRadius: 4, fontSize: 12, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                    ₱{item.total.toLocaleString()}
                  </td>
                  <td style={{ padding: '4px', textAlign: 'center' }}>
                    <button
                      onClick={() => updateItem(i, 'quantity', item.quantity > 0 ? 0 : 1)}
                      style={{
                        padding: '4px 8px',
                        fontSize: 10,
                        border: '1px solid #d9e0d7',
                        borderRadius: 4,
                        background: '#fff',
                        cursor: 'pointer',
                        color: item.quantity === 0 ? '#1a6d3e' : '#e11d48',
                      }}
                    >
                      {item.quantity > 0 ? 'Remove' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '12px 10px', borderTop: '2px solid #d9e0d7', marginTop: 4 }}>
            <div>
              <span style={{ fontSize: 12, color: '#667168' }}>Active Items: </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#151a17' }}>{activeItems.length}</span>
            </div>
            <div>
              <span style={{ fontSize: 12, color: '#667168' }}>Total: </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a6d3e', fontFamily: 'monospace' }}>₱{totalQuoted.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ── Admin Note ────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3a4339', marginBottom: 4 }}>Admin Note (shared with customer)</label>
          <textarea
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            placeholder="Describe what changed in this revision..."
            rows={2}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1.5px solid #d9e0d7',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="luxe-btn luxe-btn-primary"
            style={{ flex: 1, padding: '10px 20px', fontSize: 14, fontWeight: 700, opacity: resolving ? 0.6 : 1 }}
          >
            {resolving ? 'Saving...' : '✅ Save Changes & Resolve Revision'}
          </button>
          <button
            onClick={onReject}
            disabled={resolving}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              border: '1.5px solid #d9e0d7',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
              color: '#667168',
            }}
          >
            Reject & Keep Current
          </button>
        </div>
      </div>

      {/* ── Revision Chat ──────────────────────────────────────────────── */}
      <QuotationRevisionChat quotationId={quotationId} isAdmin />
    </div>
  )
}
