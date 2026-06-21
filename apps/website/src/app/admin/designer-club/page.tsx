'use client'

import { useState, useEffect, useCallback } from 'react'

interface Application {
  id: number
  first_name: string
  last_name: string
  position: string | null
  email: string
  company_name: string
  company_address: string | null
  contact_number: string | null
  company_socials: string | null
  status: 'new' | 'contacted' | 'approved' | 'declined'
  notes: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  new: '#5bc0de', contacted: '#f0ad4e', approved: '#1a6d3e', declined: '#991b1b',
}

export default function AdminDesignerClubPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/admin/designer-club${statusFilter ? `?status=${statusFilter}` : ''}`
      const res = await fetch(url, { credentials: 'include' })
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  async function setStatus(id: number, status: string) {
    await fetch(`/api/admin/designer-club?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    })
    load()
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#151a17' }}>🎨 Designer Club</h1>
      <p style={{ fontSize: 13, color: '#667168', margin: '0 0 20px' }}>Trade signup applications from the public Designer Club form.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'new', 'contacted', 'approved', 'declined'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
            background: statusFilter === s ? '#151a17' : '#fff', color: statusFilter === s ? '#fff' : '#667168',
            border: '1px solid #d9e0d7',
          }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#667168' }}>Loading...</div>
      ) : applications.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9aa69c' }}>No applications yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {applications.map(app => (
            <div key={app.id} style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{app.first_name} {app.last_name}</strong>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: STATUS_COLORS[app.status], padding: '2px 8px', borderRadius: 6 }}>
                    {app.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#667168', marginTop: 4 }}>{app.position} at {app.company_name}</div>
                <div style={{ fontSize: 12, color: '#667168', marginTop: 4 }}>
                  {app.email} · {app.contact_number}
                </div>
                {app.company_address && <div style={{ fontSize: 12, color: '#9aa69c', marginTop: 2 }}>{app.company_address}</div>}
                {app.company_socials && <div style={{ fontSize: 12, color: '#9aa69c', marginTop: 2 }}>{app.company_socials}</div>}
                <div style={{ fontSize: 11, color: '#9aa69c', marginTop: 6 }}>{new Date(app.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <select value={app.status} onChange={e => setStatus(app.id, e.target.value)} style={{
                  padding: '6px 10px', fontSize: 12, borderRadius: 8, border: '1.5px solid #d9e0d7',
                }}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
