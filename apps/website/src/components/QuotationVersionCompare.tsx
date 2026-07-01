'use client'

interface QuotationSnapshotItem {
  title: string
  sku: string
  quantity: number
  unitCost: number
  total: number
  notes?: string
}

interface QuotationSnapshot {
  customerName: string
  items: QuotationSnapshotItem[]
  subtotal: number
  grandTotal: number
  terms?: Record<string, string>
}

interface Props {
  previous: QuotationSnapshot | null
  current: QuotationSnapshot
  onClose?: () => void
}

function computeDiff(prevItems: QuotationSnapshotItem[], currItems: QuotationSnapshotItem[]) {
  const prevMap = new Map(prevItems.map((item, i) => [item.title || `item-${i}`, { item, index: i }]))
  const currMap = new Map(currItems.map((item, i) => [item.title || `item-${i}`, { item, index: i }]))

  const removed: QuotationSnapshotItem[] = []
  const added: QuotationSnapshotItem[] = []
  const changed: Array<{ title: string; prev: QuotationSnapshotItem; curr: QuotationSnapshotItem; fields: string[] }> = []
  const unchanged: QuotationSnapshotItem[] = []

  for (const [key, { item }] of prevMap) {
    const curr = currMap.get(key)
    if (!curr) {
      removed.push(item)
    } else {
      const diffs: string[] = []
      if (item.quantity !== curr.item.quantity) diffs.push('qty')
      if (item.unitCost !== curr.item.unitCost) diffs.push('price')
      if (item.total !== curr.item.total) diffs.push('total')
      if (diffs.length > 0) {
        changed.push({ title: key, prev: item, curr: curr.item, fields: diffs })
      } else {
        unchanged.push(item)
      }
    }
  }

  for (const [key, { item }] of currMap) {
    if (!prevMap.has(key)) added.push(item)
  }

  return { removed, added, changed, unchanged }
}

export default function QuotationVersionCompare({ previous, current, onClose }: Props) {
  if (!previous) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#667168', fontSize: 13 }}>
        This is the initial version. No previous version to compare against.
      </div>
    )
  }

  const diff = computeDiff(previous.items, current.items)
  const hasChanges = diff.removed.length > 0 || diff.added.length > 0 || diff.changed.length > 0

  return (
    <div style={{ border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: '#fafbf9',
        borderBottom: '1px solid #d9e0d7',
      }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#151a17' }}>
          📊 Changes from Previous Version
        </h3>
        {onClose && (
          <button onClick={onClose} style={{ padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#667168' }}>
            ✕
          </button>
        )}
      </div>

      {!hasChanges && (
        <div style={{ padding: 20, textAlign: 'center', color: '#667168', fontSize: 13 }}>
          No item changes in this version.
        </div>
      )}

      {hasChanges && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Pricing summary */}
          <div style={{ display: 'flex', gap: 24, padding: '8px 12px', background: '#fafbf9', borderRadius: 8, marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 11, color: '#667168' }}>Subtotal: </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: previous.subtotal !== current.subtotal ? '#e11d48' : '#151a17' }}>
                ₱{previous.subtotal.toLocaleString()} → ₱{current.subtotal.toLocaleString()}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#667168' }}>Grand Total: </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: previous.grandTotal !== current.grandTotal ? '#e11d48' : '#151a17' }}>
                ₱{previous.grandTotal.toLocaleString()} → ₱{current.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Removed items */}
          {diff.removed.map(item => (
            <div key={`removed-${item.title}`} style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔴</span>
              <span style={{ flex: 1, fontSize: 13, color: '#991b1b', textDecoration: 'line-through' }}>{item.title}</span>
              <span style={{ fontSize: 12, color: '#991b1b' }}>₱{item.total.toLocaleString()}</span>
            </div>
          ))}

          {/* Added items */}
          {diff.added.map(item => (
            <div key={`added-${item.title}`} style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🟢</span>
              <span style={{ flex: 1, fontSize: 13, color: '#166534', fontWeight: 600 }}>{item.title}</span>
              <span style={{ fontSize: 12, color: '#166534' }}>×{item.quantity} — ₱{item.total.toLocaleString()}</span>
            </div>
          ))}

          {/* Changed items */}
          {diff.changed.map(c => (
            <div key={`changed-${c.title}`} style={{ padding: '8px 12px', background: '#fefce8', borderRadius: 8, border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🟡</span>
                <span style={{ flex: 1, fontSize: 13, color: '#854d0e', fontWeight: 600 }}>{c.title}</span>
              </div>
              <div style={{ fontSize: 11, color: '#854d0e', paddingLeft: 28 }}>
                {c.fields.includes('qty') && <div>Qty: {c.prev.quantity} → {c.curr.quantity}</div>}
                {c.fields.includes('price') && <div>Unit Cost: ₱{c.prev.unitCost.toLocaleString()} → ₱{c.curr.unitCost.toLocaleString()}</div>}
                {c.fields.includes('total') && <div>Total: ₱{c.prev.total.toLocaleString()} → ₱{c.curr.total.toLocaleString()}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
