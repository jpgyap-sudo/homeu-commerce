import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'

interface SystemStatus {
  label: string
  status: 'ok' | 'warning' | 'error'
  detail: string
}

async function loadSystemHealth(): Promise<SystemStatus[]> {
  const statuses: SystemStatus[] = []

  // Database
  try {
    const r = await query('SELECT 1 as ok')
    statuses.push({
      label: 'Database (PostgreSQL)',
      status: 'ok',
      detail: r.rows[0]?.ok === 1 ? 'Connected — pg 16' : 'Unexpected response',
    })
  } catch (e) {
    statuses.push({ label: 'Database (PostgreSQL)', status: 'error', detail: String(e) })
  }

  // Next.js
  statuses.push({
    label: 'Next.js Runtime',
    status: 'ok',
    detail: `Next.js 16.2.9 — ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}`,
  })

  // Ollama
  try {
    const res = await fetch(`${process.env.OLLAMA_HOST || 'http://ollama:11434'}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = await res.json()
      statuses.push({
        label: 'Ollama AI',
        status: 'ok',
        detail: `${data.models?.length || 0} model(s) loaded`,
      })
    } else {
      statuses.push({ label: 'Ollama AI', status: 'warning', detail: `HTTP ${res.status}` })
    }
  } catch {
    statuses.push({ label: 'Ollama AI', status: 'warning', detail: 'Unreachable (may be offline)' })
  }

  // Docker
  statuses.push({
    label: 'Docker Container',
    status: 'ok',
    detail: `PID ${process.pid} — uptime ${Math.floor(process.uptime() / 60)}m`,
  })

  return statuses
}

export default async function SystemHealthPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const statuses = await loadSystemHealth()

  const statusColor = (s: string) =>
    s === 'ok' ? '#1a6d3e' : s === 'warning' ? '#d4a017' : '#e74b16'
  const statusIcon = (s: string) =>
    s === 'ok' ? '✅' : s === 'warning' ? '⚠️' : '❌'

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#151a17' }}>
        🖥️ System Health
      </h2>
      <p style={{ margin: '4px 0 24px', fontSize: 13, color: '#667168' }}>
        Monitor platform services and runtime status
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {statuses.map(s => (
          <div
            key={s.label}
            style={{
              background: '#fff', border: `1px solid ${s.status === 'ok' ? '#d9e0d7' : s.status === 'warning' ? '#f0e0b0' : '#e8c9b0'}`,
              borderLeft: `4px solid ${statusColor(s.status)}`,
              borderRadius: 12, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <span style={{ fontSize: 20 }}>{statusIcon(s.status)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#151a17' }}>{s.label}</div>
              <div style={{ fontSize: 12, color: '#667168', marginTop: 2 }}>{s.detail}</div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 4,
              background: s.status === 'ok' ? '#e8f5e9' : s.status === 'warning' ? '#fff8e1' : '#fef2e8',
              color: statusColor(s.status),
            }}>
              {s.status === 'ok' ? 'Healthy' : s.status === 'warning' ? 'Degraded' : 'Down'}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#151a17', margin: '0 0 12px' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={actionStyle}>🔄 Restart Website</button>
          <button style={actionStyle}>📋 View Server Logs</button>
          <button style={actionStyle}>🗄️ DB Connection Test</button>
        </div>
      </div>
    </div>
  )
}

const actionStyle: React.CSSProperties = {
  padding: '10px 18px', background: '#fff', border: '1px solid #d9e0d7',
  borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
  color: '#151a17', fontFamily: 'inherit',
}
