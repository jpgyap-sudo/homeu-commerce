'use client'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  completed:   { bg: '#e6f3ea', color: '#1a6d3e', label: '✅ Completed' },
  in_progress: { bg: '#e8f0fe', color: '#1a5bb5', label: '🔄 In Progress' },
  pending:     { bg: '#f7f5f0', color: '#8a7f6e', label: '⏳ Pending' },
  blocked:     { bg: '#fef2e8', color: '#b85a2a', label: '🚫 Blocked' },
  skipped:     { bg: '#f0f0f0', color: '#7d7a75', label: '⏭️ Skipped' },
  // For data status values
  new:         { bg: '#e8f0fe', color: '#1a5bb5', label: '🆕 New' },
  contacted:   { bg: '#fff8e1', color: '#9c7c1a', label: '📞 Contacted' },
  quoted:      { bg: '#e6f3ea', color: '#1a6d3e', label: '📄 Quoted' },
  qualified:   { bg: '#e6f3ea', color: '#1a6d3e', label: '✅ Qualified' },
  closed:      { bg: '#f0f0f0', color: '#5a5a5a', label: '🔒 Closed' },
  lost:        { bg: '#fef2e8', color: '#b85a2a', label: '❌ Lost' },
  won:         { bg: '#e6f3ea', color: '#1a6d3e', label: '🏆 Won' },
  spam:        { bg: '#f0f0f0', color: '#7d7a75', label: '🚫 Spam' },
  active:      { bg: '#e6f3ea', color: '#1a6d3e', label: '✅ Active' },
  draft:       { bg: '#f7f5f0', color: '#8a7f6e', label: '📝 Draft' },
  archived:    { bg: '#f0f0f0', color: '#7d7a75', label: '📦 Archived' },
}

function getStatusStyle(status: string): { bg: string; color: string; label: string } {
  return STATUS_STYLES[status] || { bg: '#f7f5f0', color: '#7d7a75', label: status }
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const style = getStatusStyle(status)
  const isSm = size === 'sm'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: isSm ? '2px 8px' : '4px 12px',
        fontSize: isSm ? 11 : 12,
        fontWeight: 600,
        lineHeight: isSm ? '20px' : '22px',
        borderRadius: 6,
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  )
}
