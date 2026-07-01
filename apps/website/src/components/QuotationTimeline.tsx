'use client'

interface VersionEntry {
  id: number
  versionNumber: number
  revisionType: string
  revisionMessage?: string
  createdAt: string
}

interface Props {
  versions: VersionEntry[]
  currentStatus: string
  hasPendingRevision: boolean
}

const STATUS_ICONS: Record<string, string> = {
  initial: '📄',
  admin_edit: '✏️',
  customer_revision: '🔄',
  reverted: '⏪',
  quotation_sent: '📨',
  quotation_accepted: '✅',
  quotation_rejected: '❌',
  revision_resolved: '🔄',
}

const STATUS_LABELS: Record<string, string> = {
  initial: 'Quotation Created',
  admin_edit: 'Admin Updated',
  customer_revision: 'Revision Requested',
  reverted: 'Version Reverted',
  quotation_sent: 'Sent to Customer',
  quotation_accepted: 'Accepted',
  quotation_rejected: 'Rejected',
  revision_resolved: 'Revision Resolved',
}

const STATUS_COLORS: Record<string, string> = {
  initial: '#059669',
  admin_edit: '#2563eb',
  customer_revision: '#d97706',
  reverted: '#667168',
  quotation_sent: '#059669',
  quotation_accepted: '#059669',
  quotation_rejected: '#e11d48',
  revision_resolved: '#8b5cf6',
}

export default function QuotationTimeline({ versions, currentStatus, hasPendingRevision }: Props) {
  // Build timeline from versions + current status
  const timeline: Array<{ icon: string; label: string; date: string; isCurrent: boolean; message?: string }> = []

  // Sort versions by version number ascending
  const sorted = [...versions].sort((a, b) => a.versionNumber - b.versionNumber)

  for (const v of sorted) {
    const icon = STATUS_ICONS[v.revisionType] || '📄'
    const label = v.revisionType === 'customer_revision' && v.revisionMessage
      ? `Revision Requested — "${v.revisionMessage.slice(0, 60)}${v.revisionMessage.length > 60 ? '...' : ''}"`
      : STATUS_LABELS[v.revisionType] || `Version ${v.versionNumber}`
    timeline.push({
      icon,
      label,
      date: v.createdAt,
      isCurrent: v.versionNumber === sorted[sorted.length - 1]?.versionNumber && !hasPendingRevision,
      message: v.revisionMessage,
    })
  }

  // Add pending revision marker
  if (hasPendingRevision) {
    timeline.push({
      icon: '⏳',
      label: 'Awaiting Admin Review',
      date: new Date().toISOString(),
      isCurrent: true,
    })
  }

  if (timeline.length === 0) return null

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#151a17' }}>
        📋 Status Timeline
      </h3>
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute',
          left: 10,
          top: 4,
          bottom: 4,
          width: 2,
          background: '#d9e0d7',
        }} />

        {timeline.map((entry, i) => (
          <div key={i} style={{ position: 'relative', paddingBottom: 16, display: 'flex', flexDirection: 'column' }}>
            {/* Dot */}
            <div style={{
              position: 'absolute',
              left: -20,
              top: 2,
              width: entry.isCurrent ? 14 : 10,
              height: entry.isCurrent ? 14 : 10,
              borderRadius: '50%',
              background: entry.isCurrent ? '#1a6d3e' : '#d9e0d7',
              border: entry.isCurrent ? '2px solid #fff' : 'none',
              boxShadow: entry.isCurrent ? '0 0 0 2px #1a6d3e' : 'none',
              zIndex: 1,
            }} />
            <div style={{
              fontSize: 13,
              color: entry.isCurrent ? '#1a6d3e' : '#667168',
              fontWeight: entry.isCurrent ? 600 : 400,
            }}>
              {entry.icon} {entry.label}
            </div>
            <div style={{ fontSize: 10, color: '#9aa69c', marginTop: 2 }}>
              {formatDate(entry.date)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
