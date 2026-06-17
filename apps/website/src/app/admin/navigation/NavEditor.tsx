'use client'

import { useState } from 'react'

interface NavItem { title: string; href: string; type?: string; children: NavItem[] }

const input: React.CSSProperties = { padding: '8px 10px', border: '1.5px solid #d9e0d7', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', background: '#fbfcfa', color: '#151a17', outline: 'none', boxSizing: 'border-box' }

export default function NavEditor({ main, footer }: { main: NavItem[]; footer: NavItem[] }) {
  const [tab, setTab] = useState<'main' | 'footer'>('main')
  const [mainItems, setMainItems] = useState<NavItem[]>(main)
  const [footerItems, setFooterItems] = useState<NavItem[]>(footer)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const items = tab === 'main' ? mainItems : footerItems
  const setItems = tab === 'main' ? setMainItems : setFooterItems
  const allowChildren = tab === 'main'

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000) }

  function updateItem(idx: number, patch: Partial<NavItem>) {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)) }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setItems(next)
  }
  function addItem() { setItems([...items, { title: 'New link', href: '/', children: [] }]) }

  function updateChild(pi: number, ci: number, patch: Partial<NavItem>) {
    setItems(items.map((it, i) => i === pi ? { ...it, children: it.children.map((c, j) => j === ci ? { ...c, ...patch } : c) } : it))
  }
  function addChild(pi: number) {
    setItems(items.map((it, i) => i === pi ? { ...it, children: [...it.children, { title: 'New sub-link', href: '/', children: [] }] } : it))
  }
  function removeChild(pi: number, ci: number) {
    setItems(items.map((it, i) => i === pi ? { ...it, children: it.children.filter((_, j) => j !== ci) } : it))
  }

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/navigation', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu: tab, items }),
      })
      flash('Menu saved')
    } finally { setSaving(false) }
  }

  return (
    <main style={{ maxWidth: 820, margin: '32px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: '#1e7a47', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 14, zIndex: 100, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#151a17' }}>Navigation</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>Edit the header and footer menus.</p>
        </div>
        <button onClick={save} disabled={saving} style={{ padding: '10px 28px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save menu'}</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['main', 'footer'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            border: tab === t ? 'none' : '1.5px solid #d9e0d7',
            background: tab === t ? '#151a17' : '#fff', color: tab === t ? '#fff' : '#3a4339',
          }}>{t === 'main' ? 'Header menu' : 'Footer menu'}</button>
        ))}
      </div>

      {items.map((item, idx) => (
        <div key={idx} style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={() => move(idx, -1)} disabled={idx === 0} style={arrowStyle(idx === 0)}>▲</button>
              <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} style={arrowStyle(idx === items.length - 1)}>▼</button>
            </div>
            <input style={{ ...input, flex: '0 0 200px' }} value={item.title} onChange={e => updateItem(idx, { title: e.target.value })} placeholder="Label" />
            <input style={{ ...input, flex: 1 }} value={item.href} onChange={e => updateItem(idx, { href: e.target.value })} placeholder="/link" />
            <button onClick={() => removeItem(idx)} style={{ flex: '0 0 auto', padding: '8px 10px', background: '#fff', border: '1.5px solid #e8c5c1', color: '#b0392f', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>Remove</button>
          </div>

          {allowChildren && (
            <div style={{ marginLeft: 34, marginTop: 10, paddingLeft: 12, borderLeft: '2px solid #eef1ed' }}>
              {item.children.map((child, ci) => (
                <div key={ci} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <input style={{ ...input, flex: '0 0 180px' }} value={child.title} onChange={e => updateChild(idx, ci, { title: e.target.value })} placeholder="Sub-label" />
                  <input style={{ ...input, flex: 1 }} value={child.href} onChange={e => updateChild(idx, ci, { href: e.target.value })} placeholder="/link" />
                  <button onClick={() => removeChild(idx, ci)} style={{ padding: '7px 9px', background: 'transparent', border: 'none', color: '#b0392f', cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              ))}
              <button onClick={() => addChild(idx)} style={{ marginTop: 4, padding: '6px 12px', background: '#f0f7f2', border: '1.5px dashed #9cc4a9', color: '#1e7a47', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add sub-link</button>
            </div>
          )}
        </div>
      ))}

      <button onClick={addItem} style={{ width: '100%', padding: '13px', background: '#fff', border: '2px dashed #c2cdbe', color: '#1e7a47', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Add menu item</button>

      <p style={{ marginTop: 32, textAlign: 'center' }}>
        <a href="/admin/dashboard" style={{ color: '#667168', fontSize: 14 }}>← Back to Dashboard</a>
      </p>
    </main>
  )
}

function arrowStyle(disabled: boolean): React.CSSProperties {
  return { border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', color: '#9aa69c', fontSize: 11, lineHeight: 1, opacity: disabled ? 0.3 : 1 }
}
