'use client'

interface RfqChatSelectToolbarProps {
  selectedCount: number
  totalCount: number
  selectMode: boolean
  onToggleSelectMode: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onDelete: () => void
  deleting: boolean
}

export default function RfqChatSelectToolbar({
  selectedCount,
  totalCount,
  selectMode,
  onToggleSelectMode,
  onSelectAll,
  onDeselectAll,
  onDelete,
  deleting,
}: RfqChatSelectToolbarProps) {
  if (!selectMode) {
    return (
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid #e0e0e0',
        background: '#fafafa',
      }}>
        <button
          onClick={onToggleSelectMode}
          style={{
            background: 'none',
            border: '1px solid #ccc',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 12,
            color: '#555',
            cursor: 'pointer',
          }}
        >
          ☐ Select Messages
        </button>
      </div>
    )
  }

  return (
    <div style={{
      padding: '8px 16px',
      borderBottom: '1px solid #e0e0e0',
      background: '#fefce8',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={onSelectAll}
          style={{
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          ☑ Select All
        </button>
        <button
          onClick={onDeselectAll}
          style={{
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          ☐ Deselect All
        </button>
        <span style={{ fontSize: 12, color: '#666' }}>
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={onDelete}
          disabled={selectedCount === 0 || deleting}
          style={{
            padding: '4px 14px',
            background: selectedCount === 0 ? '#f5f5f5' : '#dc2626',
            color: selectedCount === 0 ? '#999' : '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {deleting ? 'Processing...' : `🗑 Delete (${selectedCount})`}
        </button>
        <button
          onClick={onToggleSelectMode}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 12,
            color: '#666',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
