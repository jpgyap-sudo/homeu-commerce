'use client'

import { useEffect, useState } from 'react'

const ALL_SECTIONS = ['main', 'catalog', 'messages', 'sales', 'content', 'insights', 'apps', 'system']
const SECTION_LABELS: Record<string, string> = {
  main: 'Dashboard',
  catalog: 'Catalog',
  messages: 'Messages',
  sales: 'Sales',
  content: 'Content',
  insights: 'Insights',
  apps: 'Apps',
  system: 'System',
}
const ROLE_COLORS: Record<string, string> = {
  admin: 'info',
  superadmin: 'info',
  editor: 'success',
  sales: 'warning',
}

interface User {
  id: number
  email: string
  name: string
  role: string
  status: string
  tab_permissions: any
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [editing, setEditing] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', role: 'editor', password: '', tabs: ['*'] as string[] })
  const [msg, setMsg] = useState('')

  const fetchUsers = async () => {
    const r = await fetch('/api/admin/users')
    if (r.ok) {
      const d = await r.json()
      setUsers(d.users || [])
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const toggleTab = (tab: string) => {
    setForm(prev => {
      if (tab === '*') return { ...prev, tabs: ['*'] }
      const tabs = prev.tabs
      const next = tabs.includes(tab) ? tabs.filter(t => t !== tab) : [...tabs.filter(t => t !== '*'), tab]
      return { ...prev, tabs: next.length === 0 ? ['*'] : next }
    })
  }

  const saveUser = async () => {
    const method = editing ? 'PATCH' : 'POST'
    const body: any = editing
      ? { id: editing.id, name: form.name, role: form.role, tabs: form.tabs }
      : form
    if (!editing && form.password) body.password = form.password

    const r = await fetch('/api/admin/users', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      setMsg(editing ? 'Updated.' : 'Created.')
      setEditing(null)
      setCreating(false)
      setForm({ email: '', name: '', role: 'editor', password: '', tabs: ['*'] })
      fetchUsers()
      setTimeout(() => setMsg(''), 2000)
    } else {
      const d = await r.json()
      setMsg('Error: ' + (d.error || 'failed'))
    }
  }

  const tabs = (user: User) => {
    try {
      return typeof user.tab_permissions === 'string'
        ? JSON.parse(user.tab_permissions)
        : (user.tab_permissions || ['*'])
    } catch {
      return ['*']
    }
  }

  return (
    <div>
      <header className="luxe-page-header">
        <h1 className="luxe-page-title">User Management</h1>
        <p className="luxe-page-subtitle">Manage staff accounts, roles, and tab permissions.</p>
        <button
          onClick={() => {
            setCreating(true)
            setEditing(null)
            setForm({ email: '', name: '', role: 'editor', password: '', tabs: ['*'] })
          }}
          className="luxe-btn luxe-btn-gold luxe-btn-sm"
          style={{ marginTop: 'var(--space-4)' }}
        >
          + New Staff User
        </button>
      </header>

      {msg && (
        <div style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--luxe-emerald-bg)', color: 'var(--luxe-emerald)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 13 }}>{msg}</div>
      )}

      <div className="luxe-card">
        <table className="luxe-table" style={{ margin: 0 }}>
          <thead><tr><th>User</th><th>Role</th><th>Tabs</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)' }}>{user.email}</div>
                </td>
                <td><span className={`luxe-badge ${ROLE_COLORS[user.role] || 'neutral'}`}>{user.role}</span></td>
                <td style={{ maxWidth: 200 }}>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {tabs(user).includes('*') ? (
                      <span className="luxe-badge info" style={{ fontSize: 9 }}>All</span>
                    ) : (
                      tabs(user).map((t: string) => <span key={t} className="luxe-badge neutral" style={{ fontSize: 9 }}>{SECTION_LABELS[t] || t}</span>)
                    )}
                  </div>
                </td>
                <td><span className={`luxe-badge ${user.status === 'active' ? 'success' : 'danger'}`}>{user.status}</span></td>
                <td style={{ fontSize: 11, color: 'var(--luxe-slate-400)', fontFamily: 'var(--font-mono)' }}>{new Date(user.created_at).toLocaleDateString('en-PH')}</td>
                <td>
                  <button
                    onClick={() => {
                      setEditing(user)
                      setCreating(false)
                      setForm({ email: user.email, name: user.name, role: user.role, password: '', tabs: tabs(user) })
                    }}
                    className="luxe-btn luxe-btn-ghost luxe-btn-sm"
                    style={{ fontSize: 10 }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setEditing(null); setCreating(false) }}>
          <div className="luxe-card" style={{ width: 500, maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="luxe-card-header">
              <h2 className="luxe-card-title">{editing ? 'Edit Staff User' : 'New Staff User'}</h2>
            </div>
            <div className="luxe-card-body">
              {creating && (
                <>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--luxe-slate-400)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Email</label>
                  <input className="luxe-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@homeatelier.ph" style={{ marginBottom: 'var(--space-4)' }} />
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--luxe-slate-400)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Password</label>
                  <input className="luxe-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" style={{ marginBottom: 'var(--space-4)' }} />
                </>
              )}
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--luxe-slate-400)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Name</label>
              <input className="luxe-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ marginBottom: 'var(--space-4)' }} />

              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--luxe-slate-400)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Role</label>
              <select className="luxe-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
                <option value="admin">Admin - full access</option>
                <option value="superadmin">Super Admin - full access</option>
                <option value="editor">Editor - most tabs</option>
                <option value="sales">Sales - sales + inbox only</option>
              </select>

              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--luxe-slate-400)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Tab Permissions</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                <button onClick={() => setForm({ ...form, tabs: ['*'] })} className={`luxe-btn luxe-btn-sm ${form.tabs.includes('*') ? 'luxe-btn-primary' : 'luxe-btn-ghost'}`} style={{ fontSize: 10 }}>All Sections</button>
                {ALL_SECTIONS.map(s => (
                  <button key={s} onClick={() => toggleTab(s)} className={`luxe-btn luxe-btn-sm ${form.tabs.includes(s) && !form.tabs.includes('*') ? 'luxe-btn-primary' : 'luxe-btn-ghost'}`} style={{ fontSize: 10 }}>
                    {SECTION_LABELS[s]}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <button onClick={() => { setEditing(null); setCreating(false) }} className="luxe-btn luxe-btn-ghost luxe-btn-sm">Cancel</button>
                <button onClick={saveUser} className="luxe-btn luxe-btn-gold luxe-btn-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
