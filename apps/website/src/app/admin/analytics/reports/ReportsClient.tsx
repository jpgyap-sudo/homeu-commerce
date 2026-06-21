'use client'

import { useEffect, useState } from 'react'

const API = '/api/admin/analytics/reports'

export default function ReportsClient() {
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  const [to, setTo] = useState(today)
  const [settings, setSettings] = useState({ recipient: '', daily: false, weekly: false, monthly: false })
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`${API}?type=settings`).then(response => response.ok ? response.json() : Promise.reject()).then(setSettings).catch(() => setMessage('Could not load saved report preferences.'))
  }, [])

  function reportUrl(type: string, format = 'csv', rangeFrom = from, rangeTo = to) {
    return `${API}?type=${type}&format=${format}&from=${encodeURIComponent(rangeFrom)}&to=${encodeURIComponent(rangeTo)}`
  }

  async function saveSettings() {
    setMessage('Saving…')
    const response = await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    const data = await response.json()
    setMessage(response.ok ? 'Report preferences saved.' : data.error || 'Could not save report preferences.')
  }

  return (
    <div style={{ padding: 24, maxWidth: 1050 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>📋 Reports & Exports</h1>
      <p style={{ color: '#667168', fontSize: 13, marginBottom: 24 }}>Generate authenticated CSV or JSON exports from live data.</p>
      {message && <div role="status" style={{ padding: 10, marginBottom: 16, borderRadius: 8, background: '#f4f6f4' }}>{message}</div>}

      <Card title="Date range">
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
          <DateField label="From" value={from} setValue={setFrom} />
          <DateField label="To" value={to} setValue={setTo} />
          <a href={reportUrl('summary')} style={buttonStyle}>Generate summary CSV</a>
        </div>
      </Card>

      <Card title="Data exports">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href={reportUrl('page_views')} style={buttonStyle}>Page views CSV</a>
          <a href={reportUrl('leads')} style={buttonStyle}>Leads CSV</a>
          <a href={reportUrl('rfq')} style={buttonStyle}>RFQ pipeline CSV</a>
          <a href={reportUrl('messages')} style={buttonStyle}>Messages CSV</a>
          <a href={reportUrl('all', 'json')} style={buttonStyle}>All data JSON</a>
        </div>
      </Card>

      <Card title="Saved report preferences">
        <p style={{ color: '#667168', fontSize: 12 }}>These preferences are saved for the reporting worker; saving them does not claim that an email has already been sent.</p>
        <input type="email" placeholder="Recipient email" value={settings.recipient} onChange={event => setSettings({ ...settings, recipient: event.target.value })} style={{ padding: 9, minWidth: 280, border: '1px solid #d9e0d7', borderRadius: 8 }} />
        <div style={{ display: 'flex', gap: 16, margin: '14px 0' }}>
          {(['daily', 'weekly', 'monthly'] as const).map(key => <label key={key}><input type="checkbox" checked={settings[key]} onChange={event => setSettings({ ...settings, [key]: event.target.checked })} /> {key}</label>)}
        </div>
        <button onClick={saveSettings} style={buttonStyle}>Save preferences</button>
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 20, marginBottom: 20 }}><h2 style={{ fontSize: 15, marginTop: 0 }}>{title}</h2>{children}</section>
}

function DateField({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return <label style={{ display: 'grid', gap: 5, fontSize: 12, color: '#667168' }}>{label}<input type="date" value={value} onChange={event => setValue(event.target.value)} style={{ padding: 8, border: '1px solid #d9e0d7', borderRadius: 8 }} /></label>
}

const buttonStyle: React.CSSProperties = { display: 'inline-block', padding: '9px 14px', background: '#1a6d3e', color: '#fff', border: 0, borderRadius: 8, textDecoration: 'none', fontSize: 13, cursor: 'pointer' }
