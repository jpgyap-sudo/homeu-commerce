'use client'

import { useState } from 'react'
import { SECTION_META, SECTION_TYPES, type SectionType } from '@/lib/theme-types'
import { SECTION_SCHEMAS, type FieldDef } from './theme-schemas'

interface Section {
  id: number
  type: SectionType
  position: number
  enabled: boolean
  config: Record<string, any>
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #d9e0d7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fbfcfa', color: '#151a17', outline: 'none', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#3a4339', marginBottom: 5 }
const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12.5, lineHeight: 1.5 }

export default function ThemeEditor({ initial, initialCss }: { initial: Section[]; initialCss: string }) {
  const [sections, setSections] = useState<Section[]>(initial)
  const [openId, setOpenId] = useState<number | null>(null)
  const [codeMode, setCodeMode] = useState<Set<number>>(new Set())
  const [codeText, setCodeText] = useState<Record<number, string>>({})
  const [codeErr, setCodeErr] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState('')
  const [previewKey, setPreviewKey] = useState(0)

  // Custom CSS panel
  const [css, setCss] = useState(initialCss || '')
  const [cssOpen, setCssOpen] = useState(false)
  const [cssSaving, setCssSaving] = useState(false)

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000) }
  const refreshPreview = () => setPreviewKey(k => k + 1)

  function setConfig(id: number, key: string, value: any) {
    setSections(s => s.map(x => x.id === id ? { ...x, config: { ...x.config, [key]: value } } : x))
  }

  async function patchSection(id: number, body: any) {
    await fetch(`/api/theme/sections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }

  async function saveSection(sec: Section) {
    setSavingId(sec.id)
    try {
      let config = sec.config
      // If in code mode, parse the JSON textarea first
      if (codeMode.has(sec.id)) {
        try {
          config = JSON.parse(codeText[sec.id] ?? '{}')
          setCodeErr(e => ({ ...e, [sec.id]: '' }))
          setSections(s => s.map(x => x.id === sec.id ? { ...x, config } : x))
        } catch (err: any) {
          setCodeErr(e => ({ ...e, [sec.id]: 'Invalid JSON: ' + err.message }))
          setSavingId(null)
          return
        }
      }
      await patchSection(sec.id, { config })
      flash('Saved'); refreshPreview()
    } finally { setSavingId(null) }
  }

  function toggleCode(sec: Section) {
    setCodeMode(prev => {
      const next = new Set(prev)
      if (next.has(sec.id)) { next.delete(sec.id) }
      else {
        next.add(sec.id)
        setCodeText(t => ({ ...t, [sec.id]: JSON.stringify(sec.config, null, 2) }))
      }
      return next
    })
  }

  async function toggleEnabled(sec: Section) {
    const enabled = !sec.enabled
    setSections(s => s.map(x => x.id === sec.id ? { ...x, enabled } : x))
    await patchSection(sec.id, { enabled })
    refreshPreview()
  }

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= sections.length) return
    const next = [...sections]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setSections(next)
    await fetch('/api/theme/sections', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: next.map(s => s.id) }) })
    refreshPreview()
  }

  async function addSection(type: SectionType) {
    setAdding(false)
    const res = await fetch('/api/theme/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, config: {} }) })
    const { id } = await res.json()
    setSections(s => [...s, { id, type, position: (s.length + 1) * 10, enabled: true, config: {} }])
    setOpenId(id); refreshPreview()
  }

  async function del(id: number) {
    if (!confirm('Delete this section?')) return
    setSections(s => s.filter(x => x.id !== id))
    await fetch(`/api/theme/sections/${id}`, { method: 'DELETE' })
    refreshPreview()
  }

  async function saveCss() {
    setCssSaving(true)
    try {
      await fetch('/api/theme/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'custom_css', value: css }) })
      flash('CSS saved'); refreshPreview()
    } finally { setCssSaving(false) }
  }

  // ── List-field item editing (slides, images) ──────────────────────
  function updateListItem(id: number, key: string, idx: number, itemKey: string, val: string) {
    setSections(s => s.map(x => {
      if (x.id !== id) return x
      const arr = [...(x.config[key] || [])]
      arr[idx] = { ...arr[idx], [itemKey]: val }
      return { ...x, config: { ...x.config, [key]: arr } }
    }))
  }
  function addListItem(id: number, key: string) {
    setSections(s => s.map(x => x.id === id ? { ...x, config: { ...x.config, [key]: [...(x.config[key] || []), {}] } } : x))
  }
  function removeListItem(id: number, key: string, idx: number) {
    setSections(s => s.map(x => {
      if (x.id !== id) return x
      const arr = (x.config[key] || []).filter((_: any, i: number) => i !== idx)
      return { ...x, config: { ...x.config, [key]: arr } }
    }))
  }

  function renderField(sec: Section, f: FieldDef) {
    if (f.type === 'list') {
      const items: any[] = sec.config[f.key] || []
      return (
        <div key={f.key} style={{ marginBottom: 16 }}>
          <label style={lbl}>{f.label}</label>
          {items.map((item, idx) => (
            <div key={idx} style={{ border: '1px solid #eef1ed', borderRadius: 8, padding: 12, marginBottom: 8, position: 'relative', background: '#fafbf9' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(f.itemFields || []).map(itf => (
                  <div key={itf.key} style={{ gridColumn: itf.type === 'url' ? '1 / -1' : 'auto' }}>
                    <label style={{ ...lbl, fontSize: 11 }}>{itf.label}</label>
                    <input style={input} value={item[itf.key] || ''} onChange={e => updateListItem(sec.id, f.key, idx, itf.key, e.target.value)} />
                  </div>
                ))}
              </div>
              <button onClick={() => removeListItem(sec.id, f.key, idx)} style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent', color: '#b0392f', cursor: 'pointer', fontSize: 13 }}>Remove</button>
            </div>
          ))}
          <button onClick={() => addListItem(sec.id, f.key)} style={{ padding: '7px 14px', background: '#f0f7f2', border: '1.5px dashed #9cc4a9', color: '#1e7a47', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add item</button>
        </div>
      )
    }
    const val = sec.config[f.key] ?? ''
    return (
      <div key={f.key} style={{ marginBottom: 14 }}>
        <label style={lbl}>{f.label}</label>
        {f.type === 'textarea'
          ? <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} value={val} onChange={e => setConfig(sec.id, f.key, e.target.value)} placeholder={f.placeholder} />
          : <input style={input} type={f.type === 'number' ? 'number' : 'text'} value={val} onChange={e => setConfig(sec.id, f.key, f.type === 'number' ? (parseInt(e.target.value, 10) || 0) : e.target.value)} placeholder={f.placeholder} />}
        {f.help && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9aa69c' }}>{f.help}</p>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 0, fontFamily: 'Inter, sans-serif', height: 'calc(100vh - 0px)' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: '#1e7a47', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 14, zIndex: 100, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>{toast}</div>}

      {/* ── Left: editor ── */}
      <div style={{ flex: '1 1 560px', minWidth: 0, overflowY: 'auto', padding: '28px 24px', maxWidth: 720 }}>
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#151a17' }}>Theme · Homepage</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>Reorder, toggle, edit visually or as code. The preview updates on save.</p>
        </div>

        {/* Custom CSS panel */}
        <div style={{ ...card, marginTop: 18 }}>
          <button onClick={() => setCssOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 18 }}>🎨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#151a17' }}>Custom CSS</div>
              <div style={{ fontSize: 12, color: '#9aa69c' }}>Site-wide style overrides, injected into every page</div>
            </div>
            <span style={{ color: '#9aa69c' }}>{cssOpen ? '▲' : '▼'}</span>
          </button>
          {cssOpen && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #eef1ed' }}>
              <textarea value={css} onChange={e => setCss(e.target.value)} spellCheck={false}
                style={{ ...input, ...mono, minHeight: 200, resize: 'vertical', marginTop: 12 }}
                placeholder={'/* e.g. */\n.site-header__logo-image { max-height: 56px; }'} />
              <button onClick={saveCss} disabled={cssSaving} style={{ marginTop: 10, padding: '9px 24px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{cssSaving ? 'Saving…' : 'Save CSS'}</button>
            </div>
          )}
        </div>

        <div style={{ margin: '14px 0' }}>
          {sections.map((sec, idx) => {
            const meta = SECTION_META[sec.type]
            const open = openId === sec.id
            const schema = SECTION_SCHEMAS[sec.type] || []
            const inCode = codeMode.has(sec.id)
            return (
              <div key={sec.id} style={{ ...card, opacity: sec.enabled ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} style={{ border: 'none', background: 'transparent', cursor: idx === 0 ? 'default' : 'pointer', color: '#9aa69c', fontSize: 12, lineHeight: 1, opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                    <button onClick={() => move(idx, 1)} disabled={idx === sections.length - 1} style={{ border: 'none', background: 'transparent', cursor: idx === sections.length - 1 ? 'default' : 'pointer', color: '#9aa69c', fontSize: 12, lineHeight: 1, opacity: idx === sections.length - 1 ? 0.3 : 1 }}>▼</button>
                  </div>
                  <span style={{ fontSize: 20 }}>{meta?.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#151a17' }}>{meta?.label || sec.type}</div>
                    <div style={{ fontSize: 12, color: '#9aa69c' }}>{meta?.description}</div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#667168', cursor: 'pointer' }}>
                    <input type="checkbox" checked={sec.enabled} onChange={() => toggleEnabled(sec)} />
                    {sec.enabled ? 'Shown' : 'Hidden'}
                  </label>
                  <button onClick={() => setOpenId(open ? null : sec.id)} style={{ padding: '7px 16px', background: open ? '#151a17' : '#f0f7f2', color: open ? '#fff' : '#1e7a47', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {open ? 'Close' : 'Edit'}
                  </button>
                </div>

                {open && (
                  <div style={{ padding: '4px 16px 18px', borderTop: '1px solid #eef1ed' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                      <button onClick={() => toggleCode(sec)} style={{ padding: '5px 12px', background: inCode ? '#151a17' : '#f4f6f2', color: inCode ? '#fff' : '#3a4339', border: '1px solid #d9e0d7', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', ...mono }}>
                        {inCode ? 'Form view' : '</> Edit as code'}
                      </button>
                    </div>

                    {inCode ? (
                      <>
                        <textarea value={codeText[sec.id] ?? ''} onChange={e => setCodeText(t => ({ ...t, [sec.id]: e.target.value }))} spellCheck={false}
                          style={{ ...input, ...mono, minHeight: 240, resize: 'vertical' }} />
                        {codeErr[sec.id] && <p style={{ color: '#b0392f', fontSize: 12, margin: '6px 0 0' }}>{codeErr[sec.id]}</p>}
                      </>
                    ) : (
                      schema.length === 0
                        ? <p style={{ color: '#9aa69c', fontSize: 13 }}>This section has no editable fields. Use “Edit as code”.</p>
                        : schema.map(f => renderField(sec, f))
                    )}

                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button onClick={() => saveSection(sec)} disabled={savingId === sec.id} style={{ padding: '9px 24px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{savingId === sec.id ? 'Saving…' : 'Save section'}</button>
                      <button onClick={() => del(sec.id)} style={{ padding: '9px 18px', background: '#fff', color: '#b0392f', border: '1.5px solid #e8c5c1', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add section */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setAdding(!adding)} style={{ width: '100%', padding: '14px', background: '#fff', border: '2px dashed #c2cdbe', color: '#1e7a47', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Add section</button>
          {adding && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8, background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, zIndex: 20 }}>
              {SECTION_TYPES.map(t => (
                <button key={t} onClick={() => addSection(t)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid #eef1ed', borderRadius: 8, background: '#fafbf9', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 16 }}>{SECTION_META[t].icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#151a17' }}>{SECTION_META[t].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <p style={{ marginTop: 28, textAlign: 'center' }}>
          <a href="/admin/dashboard" style={{ color: '#667168', fontSize: 14 }}>← Back to Dashboard</a>
        </p>
      </div>

      {/* ── Right: live preview ── */}
      <div style={{ flex: '1 1 520px', minWidth: 380, borderLeft: '1px solid #e3e8e0', background: '#eef1ed', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e3e8e0' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#151a17' }}>Live preview</span>
          <span style={{ fontSize: 12, color: '#9aa69c' }}>storefront homepage</span>
          <div style={{ flex: 1 }} />
          <button onClick={refreshPreview} style={{ padding: '6px 14px', background: '#f0f7f2', color: '#1e7a47', border: '1px solid #cfe3d6', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>↻ Refresh</button>
          <a href="/" target="_blank" rel="noreferrer" style={{ padding: '6px 12px', fontSize: 12, color: '#1a6d3e', textDecoration: 'none', fontWeight: 600 }}>Open ↗</a>
        </div>
        <iframe
          key={previewKey}
          src={`/?preview=${previewKey}`}
          title="Storefront preview"
          style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
        />
      </div>
    </div>
  )
}
