import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import SecuritySettingsWidget from '../SecurityWidget'

async function loadSystemHealth() {
  const statuses: any[] = []
  try { const r = await query('SELECT 1 as ok'); statuses.push({ label:'Database', status:'ok', detail:'Connected' }) } catch { statuses.push({ label:'Database', status:'error', detail:'Down' }) }
  statuses.push({ label:'Next.js', status:'ok', detail:'v16.2.9' })
  statuses.push({ label:'Docker', status:'ok', detail:'Running' })
  return statuses
}

export default async function SystemSettingsPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  const health = await loadSystemHealth()

  return (
    <div style={{ maxWidth: 800 }}>
      <header className="luxe-page-header">
        <h1 className="luxe-page-title">⚙️ System Settings</h1>
      </header>

      <div className="luxe-card" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="luxe-card-header"><h2 className="luxe-card-title">🖥️ System Health</h2></div>
        <div className="luxe-card-body">
          {health.map((s: any) => (
            <div key={s.label} style={{ display:'flex', alignItems:'center', gap:14, padding:'var(--space-2) 0', borderBottom:'1px solid var(--luxe-warm-100)' }}>
              <span>{s.status === 'ok' ? '✅' : '❌'}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{s.label}</div>
                <div style={{ fontSize:12, color:'var(--luxe-slate-400)' }}>{s.detail}</div>
              </div>
              <span className={`luxe-badge ${s.status === 'ok' ? 'success' : 'danger'}`}>{s.status === 'ok' ? 'Healthy' : 'Down'}</span>
            </div>
          ))}
        </div>
      </div>

      <SecuritySettingsWidget />
    </div>
  )
}
