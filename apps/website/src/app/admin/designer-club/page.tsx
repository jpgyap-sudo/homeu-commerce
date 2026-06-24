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
  customer_id: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

const STATUS_COLORS: Record<string, string> = {
  new: '#5bc0de', contacted: '#f0ad4e', approved: '#1a6d3e', declined: '#991b1b',
}

export default function AdminDesignerClubPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [noteText, setNoteText] = useState('')

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Modal editing states
  const [isEditingDetail, setIsEditingDetail] = useState(false)
  const [editModalForm, setEditModalForm] = useState<Partial<Application>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setSelectedIds([])
    try {
      const url = `/api/admin/designer-club${statusFilter ? `?status=${statusFilter}` : ''}`
      const res = await fetch(url, { credentials: 'include' })
      const data = await res.json()
      setApplications(data.applications || [])
    } catch { setApplications([]) }
    finally { setLoading(false) }
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

  async function saveNote() {
    if (!selectedApp) return
    await fetch(`/api/admin/designer-club?id=${selectedApp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notes: noteText }),
    })
    setSelectedApp({ ...selectedApp, notes: noteText })
    load()
  }

  // Bulk delete selected items
  async function handleDeleteSelected() {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected designer application(s)?`)) return
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/admin/designer-club?id=${id}`, { method: 'DELETE' })))
      setApplications(prev => prev.filter(app => !selectedIds.includes(app.id)))
      setSelectedIds([])
    } catch (err: any) {
      alert(err.message || 'Failed to delete selected applications')
    }
  }

  // Save changes made in modal Edit Mode
  async function saveModalChanges() {
    if (!selectedApp) return
    try {
      const res = await fetch(`/api/admin/designer-club?id=${selectedApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: editModalForm.first_name,
          lastName: editModalForm.last_name,
          position: editModalForm.position,
          email: editModalForm.email,
          companyName: editModalForm.company_name,
          companyAddress: editModalForm.company_address,
          contactNumber: editModalForm.contact_number,
          companySocials: editModalForm.company_socials,
          status: editModalForm.status,
          notes: editModalForm.notes,
        }),
      })
      if (!res.ok) throw new Error('Failed to save changes')
      const data = await res.json()
      const app = data.application
      setSelectedApp(app)
      setNoteText(app.notes || '')
      setIsEditingDetail(false)
      load()
    } catch (err: any) {
      alert(err.message || 'Failed to save changes')
    }
  }

  async function exportCsv() {
    const res = await fetch('/api/admin/designer-club?format=csv', { credentials: 'include' })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `designer-club-applications-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const detailView = selectedApp ? (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={() => setSelectedApp(null)}>
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 500, width: '100%', padding: 28, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {isEditingDetail ? 'Edit Application Details' : `${selectedApp.first_name} ${selectedApp.last_name}`}
          </h2>
          <button onClick={() => setSelectedApp(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#667168' }}>✕</button>
        </div>

        {isEditingDetail ? (
          // Modal Edit Mode form
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>First Name</label>
                <input
                  type="text"
                  value={editModalForm.first_name || ''}
                  onChange={e => setEditModalForm({ ...editModalForm, first_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d9e0d7', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Last Name</label>
                <input
                  type="text"
                  value={editModalForm.last_name || ''}
                  onChange={e => setEditModalForm({ ...editModalForm, last_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d9e0d7', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Status</label>
              <select
                value={editModalForm.status || 'new'}
                onChange={e => setEditModalForm({ ...editModalForm, status: e.target.value as any })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d9e0d7', boxSizing: 'border-box' }}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Email</label>
              <input
                type="email"
                value={editModalForm.email || ''}
                onChange={e => setEditModalForm({ ...editModalForm, email: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d9e0d7', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Position</label>
              <input
                type="text"
                value={editModalForm.position || ''}
                onChange={e => setEditModalForm({ ...editModalForm, position: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d9e0d7', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Company Name</label>
              <input
                type="text"
                value={editModalForm.company_name || ''}
                onChange={e => setEditModalForm({ ...editModalForm, company_name: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d9e0d7', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Company Address</label>
              <input
                type="text"
                value={editModalForm.company_address || ''}
                onChange={e => setEditModalForm({ ...editModalForm, company_address: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d9e0d7', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Contact Number</label>
              <input
                type="text"
                value={editModalForm.contact_number || ''}
                onChange={e => setEditModalForm({ ...editModalForm, contact_number: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d9e0d7', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Company Socials</label>
              <input
                type="text"
                value={editModalForm.company_socials || ''}
                onChange={e => setEditModalForm({ ...editModalForm, company_socials: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d9e0d7', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Internal Notes</label>
              <textarea
                value={editModalForm.notes || ''}
                onChange={e => setEditModalForm({ ...editModalForm, notes: e.target.value })}
                rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d9e0d7', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                onClick={() => setIsEditingDetail(false)}
                style={{ padding: '8px 16px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={saveModalChanges}
                style={{ padding: '8px 24px', background: '#1a6d3e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          // Modal Details Mode (Read Mode + notes)
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                onClick={() => {
                  setEditModalForm(selectedApp)
                  setIsEditingDetail(true)
                }}
                style={{ padding: '6px 16px', background: '#f5f5f5', border: '1.5px solid #d9e0d7', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                ✏️ Edit Details
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div><strong>Status:</strong> <span style={{ color: STATUS_COLORS[selectedApp.status], fontWeight: 700, textTransform: 'uppercase' }}>{selectedApp.status}</span></div>
              <select value={selectedApp.status} onChange={e => setStatus(selectedApp.id, e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d9e0d7', fontSize: 13 }}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </select>
              <div><strong>Email:</strong> {selectedApp.email}</div>
              <div><strong>Position:</strong> {selectedApp.position || '—'}</div>
              <div><strong>Company:</strong> {selectedApp.company_name}</div>
              <div><strong>Address:</strong> {selectedApp.company_address || '—'}</div>
              <div><strong>Contact:</strong> {selectedApp.contact_number || '—'}</div>
              <div><strong>Socials:</strong> {selectedApp.company_socials || '—'}</div>
              {selectedApp.customer_id && <div><strong>Linked Customer ID:</strong> {selectedApp.customer_id}</div>}
              <div style={{ fontSize: 11, color: '#9aa69c' }}>Applied: {new Date(selectedApp.created_at).toLocaleString('en-PH')}</div>
            </div>

            {/* Notes */}
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Internal Notes</label>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                rows={3} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d9e0d7', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              <button onClick={saveNote} style={{ marginTop: 8, padding: '8px 16px', background: '#151a17', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save Note</button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#151a17' }}>🎨 Designer Club</h1>
          <p style={{ fontSize: 13, color: '#667168', margin: '0 0 20px' }}>Trade signup applications from the public form.</p>
        </div>
        <button onClick={exportCsv} style={{ padding: '8px 16px', background: '#f0f7f2', color: '#1e7a47', border: '1px solid #cfe3d6', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          📥 Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'new', 'contacted', 'approved', 'declined'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
            background: statusFilter === s ? '#151a17' : '#fff', color: statusFilter === s ? '#fff' : '#667168',
            border: '1px solid #d9e0d7',
          }}>
            {s || 'All'} {s === 'new' && ` (${applications.filter(a => a.status === 'new').length})`}
          </button>
        ))}
      </div>

      {/* Select All / Delete Selected actions toolbar */}
      {!loading && applications.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0', padding: '0 8px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#667168', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={applications.length > 0 && selectedIds.length === applications.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(applications.map(app => app.id))
                } else {
                  setSelectedIds([])
                }
              }}
            />
            Select All
          </label>
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              style={{
                padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none',
                borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}
            >
              🗑️ Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#667168' }}>Loading...</div>
      ) : applications.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9aa69c' }}>No applications yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {applications.map(app => (
            <div key={app.id} style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
              onClick={() => {
                setSelectedApp(app)
                setNoteText(app.notes || '')
                setIsEditingDetail(false)
                setEditModalForm(app)
              }}>
              
              <input
                type="checkbox"
                checked={selectedIds.includes(app.id)}
                onChange={(e) => {
                  e.stopPropagation() // Don't trigger modal click
                  if (e.target.checked) {
                    setSelectedIds(prev => [...prev, app.id])
                  } else {
                    setSelectedIds(prev => prev.filter(id => id !== app.id))
                  }
                }}
              />

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{app.first_name} {app.last_name}</strong>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: STATUS_COLORS[app.status], padding: '2px 8px', borderRadius: 6 }}>
                    {app.status.toUpperCase()}
                  </span>
                  {app.customer_id && <span style={{ fontSize: 9, color: '#2563eb' }}>🔗 Linked</span>}
                </div>
                <div style={{ fontSize: 13, color: '#667168', marginTop: 4 }}>{app.position} at {app.company_name}</div>
                <div style={{ fontSize: 12, color: '#667168', marginTop: 4 }}>{app.email} · {app.contact_number}</div>
                {app.notes && <div style={{ fontSize: 11, color: '#9aa69c', marginTop: 4, fontStyle: 'italic' }}>Note: {app.notes}</div>}
                <div style={{ fontSize: 11, color: '#9aa69c', marginTop: 6 }}>{new Date(app.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailView}
    </div>
  )
}
