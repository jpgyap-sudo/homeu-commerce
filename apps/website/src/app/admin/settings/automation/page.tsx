'use client'

import { useEffect, useState } from 'react'

interface AutomationConfig {
  enabled: boolean
  abandonedCartDelayHours: number
  abandonedCartFollowUpHours: number
  stalledRfqDelayHours: number
  expiringQuoteDelayHours: number
  maxDailyEmails: number
}

interface CronStats {
  lastRun: string | null
  lastResult: string | null
  todaySent: number
  weekSent: number
  recentLogs: Array<{
    id: number
    action_sent: string
    cart_id: number | null
    quotation_id: number | null
    rfq_id: number | null
    created_at: string
  }>
}

export default function AutomationSettingsPage() {
  const [config, setConfig] = useState<AutomationConfig>({
    enabled: true,
    abandonedCartDelayHours: 2,
    abandonedCartFollowUpHours: 24,
    stalledRfqDelayHours: 24,
    expiringQuoteDelayHours: 48,
    maxDailyEmails: 50,
  })
  const [stats, setStats] = useState<CronStats | null>(null)
  const [saving, setSaving] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadConfig()
    loadStats()
  }, [])

  async function loadConfig() {
    const res = await fetch('/api/admin/settings/automation')
    if (res.ok) {
      const data = await res.json()
      if (data.config) setConfig(data.config)
    }
  }

  async function loadStats() {
    const res = await fetch('/api/admin/settings/automation/stats')
    if (res.ok) {
      const data = await res.json()
      setStats(data)
    }
  }

  async function saveConfig() {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/settings/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Save failed')
      setMessage('Settings saved')
    } catch (err: any) {
      setMessage('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function triggerCron() {
    setTriggering(true)
    setMessage('')
    try {
      const res = await fetch('/api/cron/crm-trigger')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Trigger failed')
      setMessage(`Cron ran: ${data.processed?.abandonedCartsSent || 0} cart emails, ${data.processed?.stalledRfqSent || 0} RFQ follow-ups, ${data.processed?.expiringQuotesSent || 0} expiring quote reminders`)
      loadStats()
    } catch (err: any) {
      setMessage('Error: ' + err.message)
    } finally {
      setTriggering(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid #d9e0d7', borderRadius: 6,
    fontSize: 14, boxSizing: 'border-box',
  }

  return (
    <main style={{ maxWidth: 900, margin: '36px auto', padding: '0 24px 56px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#151a17' }}>CRM Automation</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>
            Automated abandoned cart recovery, RFQ follow-up, and quotation reminders
          </p>
        </div>
        <button onClick={triggerCron} disabled={triggering}
          style={{ padding: '10px 20px', background: '#1a6d3e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: triggering ? 'not-allowed' : 'pointer' }}>
          {triggering ? 'Running…' : '▶ Run cron now'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '10px 14px', background: message.startsWith('Error') ? '#fee' : '#e8f5e9', color: message.startsWith('Error') ? '#c00' : '#2e7d32', borderRadius: 8, marginBottom: 20, fontSize: 13 }}>{message}</div>
      )}

      {/* Stats Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Last cron run" value={stats?.lastRun ? new Date(stats.lastRun).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never'} />
        <StatCard label="Sent today" value={String(stats?.todaySent ?? 0)} />
        <StatCard label="Sent this week" value={String(stats?.weekSent ?? 0)} />
        <StatCard label="Status" value={config.enabled ? 'Active' : 'Paused'} color={config.enabled ? '#1a6d3e' : '#b88935'} />
      </div>

      {/* Settings */}
      <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Automation Settings</h2>
        <div style={{ display: 'grid', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} />
            Enable CRM automation
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Abandoned cart initial delay (hours)
              <input type="number" min={1} max={72} value={config.abandonedCartDelayHours} onChange={e => setConfig({ ...config, abandonedCartDelayHours: Number(e.target.value) })} style={inputStyle} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Abandoned cart follow-up delay (hours)
              <input type="number" min={6} max={168} value={config.abandonedCartFollowUpHours} onChange={e => setConfig({ ...config, abandonedCartFollowUpHours: Number(e.target.value) })} style={inputStyle} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Stalled RFQ follow-up delay (hours)
              <input type="number" min={6} max={168} value={config.stalledRfqDelayHours} onChange={e => setConfig({ ...config, stalledRfqDelayHours: Number(e.target.value) })} style={inputStyle} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Expiring quote reminder window (hours before)
              <input type="number" min={6} max={168} value={config.expiringQuoteDelayHours} onChange={e => setConfig({ ...config, expiringQuoteDelayHours: Number(e.target.value) })} style={inputStyle} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Max automated emails per run
              <input type="number" min={1} max={500} value={config.maxDailyEmails} onChange={e => setConfig({ ...config, maxDailyEmails: Number(e.target.value) })} style={inputStyle} />
            </label>
          </div>
        </div>
        <button onClick={saveConfig} disabled={saving}
          style={{ marginTop: 16, padding: '10px 24px', background: '#151a17', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Recent Activity */}
      <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eef1ed' }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Recent Automation Activity</h2>
        </div>
        {stats?.recentLogs && stats.recentLogs.length > 0 ? (
          <div style={{ padding: '0 20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#667168', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px' }}>Action</th>
                  <th style={{ padding: '12px 8px' }}>Context</th>
                  <th style={{ padding: '12px 8px' }}>Sent</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLogs.map(log => (
                  <tr key={log.id} style={{ borderTop: '1px solid #eef1ed' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>{log.action_sent.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '10px 8px', color: '#667168' }}>
                      {log.cart_id ? `Cart #${log.cart_id}` : log.quotation_id ? `Quote #${log.quotation_id}` : log.rfq_id ? `RFQ #${log.rfq_id}` : '—'}
                    </td>
                    <td style={{ padding: '10px 8px', color: '#667168' }}>{new Date(log.created_at).toLocaleString('en-PH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 32, textAlign: 'center', color: '#667168', fontSize: 14 }}>No automation activity yet.</div>
        )}
      </div>
    </main>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 12, color: '#667168', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#151a17' }}>{value}</div>
    </div>
  )
}
