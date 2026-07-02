'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { ImagePickerField } from '@/components/admin/ImagePickerField'

type FieldType = 'toggle' | 'select' | 'range' | 'text' | 'textarea' | 'color' | 'image'

export interface ThemeField {
  key: string
  label: string
  type: FieldType
  help?: string
  min?: number
  max?: number
  step?: number
  unit?: string
  placeholder?: string
  rows?: number
  options?: Array<{ value: string; label: string; help?: string }>
  textPresets?: Array<{ label: string; value: string }>
  aspectRatio?: string
  disabledWhen?: (settings: Record<string, any>) => boolean
  disabledReason?: string
}

export interface ThemeFieldSection {
  title: string
  description?: string
  fields: ThemeField[]
}

export interface ThemePreset {
  label: string
  description: string
  values: Record<string, any>
}

type PreviewKind = 'product' | 'account' | 'mobile' | 'global' | 'quotation'

interface NoCodeThemeStudioProps {
  title: string
  description: string
  endpoint: string
  defaults: Record<string, any>
  sections: ThemeFieldSection[]
  preview: PreviewKind
  previewLabel: string
  presets?: ThemePreset[]
  /** When set, the preview panel renders the real generated PDF (via this
   *  endpoint) instead of the client-side mock preview. POST body is the
   *  current (possibly unsaved) settings; response is the PDF binary. */
  pdfPreviewEndpoint?: string
  /** When set, shows a "Send test to my email" button that POSTs the
   *  current settings to this endpoint, which emails a test PDF. */
  testEmailEndpoint?: string
  /** When set, the preview panel renders the REAL live storefront (phone-
   *  framed iframe + "Open in new tab") instead of the mock preview, reusing
   *  the same draft-preview mechanism the Online Store Theme Editor already
   *  uses (POST to theme_preview_draft, then load the storefront with
   *  ?preview=N so it reads the draft instead of published settings). */
  htmlPreviewConfig?: {
    draftEndpoint: string
    buildDraftPayload: (settings: Record<string, any>) => object
    previewUrl: string
  }
}

const shell: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
  gap: 18,
  alignItems: 'start',
}

const panel: CSSProperties = {
  background: '#fff',
  border: '1px solid #d9e0d7',
  borderRadius: 8,
  overflow: 'hidden',
}

const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #ccd6cf',
  borderRadius: 6,
  background: '#fff',
  color: '#17211b',
  font: 'inherit',
  fontSize: 13,
  padding: '9px 11px',
  outline: 'none',
}

const smallLabel: CSSProperties = {
  display: 'block',
  color: '#3a4339',
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 6,
}

function mergeDefaults(defaults: Record<string, any>, data: any) {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? { ...defaults, ...data }
    : { ...defaults }
}

export default function NoCodeThemeStudio({
  title,
  description,
  endpoint,
  defaults,
  sections,
  preview,
  previewLabel,
  presets = [],
  pdfPreviewEndpoint,
  testEmailEndpoint,
  htmlPreviewConfig,
}: NoCodeThemeStudioProps) {
  const [settings, setSettings] = useState<Record<string, any>>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [activeSection, setActiveSection] = useState(sections[0]?.title || '')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [htmlPreviewKey, setHtmlPreviewKey] = useState(0)
  const [htmlPreviewLoading, setHtmlPreviewLoading] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testStatus, setTestStatus] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(endpoint, { credentials: 'include' })
      .then(async res => {
        if (!res.ok) throw new Error('Could not load theme settings')
        return res.json()
      })
      .then(data => {
        if (!cancelled) setSettings(mergeDefaults(defaults, data))
      })
      .catch(err => {
        if (!cancelled) setStatus(err.message || 'Could not load theme settings')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [defaults, endpoint])

  // Real-PDF live preview: debounced re-render of the actual PDF whenever
  // settings change, instead of the hand-built mock preview.
  useEffect(() => {
    if (!pdfPreviewEndpoint || loading) return
    let cancelled = false
    setPdfLoading(true)
    const timer = setTimeout(() => {
      fetch(pdfPreviewEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      })
        .then(res => { if (!res.ok) throw new Error('Preview failed'); return res.blob() })
        .then(blob => {
          if (cancelled) return
          const url = URL.createObjectURL(blob)
          setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setPdfLoading(false) })
    }, 600)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, pdfPreviewEndpoint, loading])

  // Real live preview: debounced push of current (unsaved) settings into the
  // shared theme_preview_draft row, then bump the iframe key so it reloads
  // with ?preview=N and picks up the draft via the x-theme-preview header.
  useEffect(() => {
    if (!htmlPreviewConfig || loading) return
    let cancelled = false
    setHtmlPreviewLoading(true)
    const timer = setTimeout(() => {
      fetch(htmlPreviewConfig.draftEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(htmlPreviewConfig.buildDraftPayload(settings)),
      })
        .then(() => { if (!cancelled) setHtmlPreviewKey(k => k + 1) })
        .catch(() => {})
        .finally(() => { if (!cancelled) setHtmlPreviewLoading(false) })
    }, 600)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, htmlPreviewConfig, loading])

  async function sendTest() {
    if (!testEmailEndpoint) return
    setSendingTest(true)
    setTestStatus('')
    try {
      const res = await fetch(testEmailEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to send test email')
      setTestStatus(`Sent to ${data.sentTo || 'your email'}`)
    } catch (err: any) {
      setTestStatus(err.message || 'Failed to send test email')
    } finally {
      setSendingTest(false)
      setTimeout(() => setTestStatus(''), 4500)
    }
  }

  const active = useMemo(
    () => sections.find(section => section.title === activeSection) || sections[0],
    [activeSection, sections]
  )

  function update(key: string, value: any) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setStatus('')
  }

  async function save() {
    setSaving(true)
    setStatus('')
    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setStatus('Saved')
      setTimeout(() => setStatus(''), 2200)
    } catch (err: any) {
      setStatus(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function applyPreset(values: Record<string, any>) {
    setSettings(prev => ({ ...prev, ...values }))
    setStatus('Preset applied. Save to publish it.')
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: '#151a17', letterSpacing: 0 }}>{title}</h2>
          <p style={{ margin: '5px 0 0', color: '#667168', fontSize: 13, maxWidth: 720 }}>{description}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {status && (
            <span style={{
              color: status === 'Saved' ? '#17693a' : '#8a5a00',
              background: status === 'Saved' ? '#e8f3ec' : '#fff6df',
              border: `1px solid ${status === 'Saved' ? '#b7d4c2' : '#efd48c'}`,
              borderRadius: 999,
              padding: '7px 10px',
              fontSize: 12,
              fontWeight: 800,
            }}>
              {status}
            </span>
          )}
          <button type="button" onClick={() => setSettings({ ...defaults })} className="luxe-btn luxe-btn-ghost">Reset</button>
          <button type="button" onClick={save} disabled={saving || loading} className="luxe-btn luxe-btn-primary">
            {saving ? 'Saving' : 'Save'}
          </button>
        </div>
      </div>

      <div style={shell}>
        <aside style={{ display: 'grid', gap: 12 }}>
          {presets.length > 0 && (
            <section style={panel}>
              <div style={{ padding: '13px 15px', borderBottom: '1px solid #eef1ed' }}>
                <strong style={{ fontSize: 13, color: '#151a17' }}>Starter presets</strong>
              </div>
              <div style={{ padding: 12, display: 'grid', gap: 8 }}>
                {presets.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset.values)}
                    style={{
                      textAlign: 'left',
                      border: '1px solid #dfe6df',
                      background: '#fbfcfa',
                      borderRadius: 6,
                      padding: 11,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'block', color: '#151a17', fontSize: 13, fontWeight: 850 }}>{preset.label}</span>
                    <span style={{ display: 'block', color: '#667168', fontSize: 11, marginTop: 3 }}>{preset.description}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <nav style={{ ...panel, padding: 8, display: 'grid', gap: 4 }}>
            {sections.map(section => {
              const selected = active?.title === section.title
              return (
                <button
                  key={section.title}
                  type="button"
                  onClick={() => setActiveSection(section.title)}
                  style={{
                    border: selected ? '1px solid #a9c9b6' : '1px solid transparent',
                    background: selected ? '#eef6f1' : 'transparent',
                    color: selected ? '#145c35' : '#3a4339',
                    borderRadius: 6,
                    padding: '10px 11px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 850,
                  }}
                >
                  {section.title}
                  {section.description && <span style={{ display: 'block', marginTop: 2, color: '#7a857d', fontSize: 11, fontWeight: 600 }}>{section.description}</span>}
                </button>
              )
            })}
          </nav>

          {active && (
            <section style={panel}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #eef1ed' }}>
                <strong style={{ color: '#151a17', fontSize: 14 }}>{active.title}</strong>
                {active.description && <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 12 }}>{active.description}</p>}
              </div>
              <div style={{ padding: 16, display: 'grid', gap: 16 }}>
                {active.fields.map(field => (
                  <FieldControl
                    key={field.key}
                    field={field}
                    value={settings[field.key]}
                    settings={settings}
                    customPresets={settings[`${field.key}__presets`] || []}
                    onChange={value => update(field.key, value)}
                    onSaveCustomPreset={label => update(`${field.key}__presets`, [
                      ...((settings[`${field.key}__presets`] as any[]) || []),
                      { label, value: settings[field.key] },
                    ])}
                    onDeleteCustomPreset={index => update(`${field.key}__presets`, (
                      (settings[`${field.key}__presets`] as any[]) || []
                    ).filter((_, i) => i !== index))}
                  />
                ))}
              </div>
            </section>
          )}
        </aside>

        <section style={{ position: 'sticky', top: 118, display: 'grid', gap: 10 }}>
          <div style={{ ...panel, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13, color: '#151a17' }}>{previewLabel}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {testStatus && <span style={{ fontSize: 11, color: testStatus.startsWith('Sent') ? '#17693a' : '#8a5a00', fontWeight: 700 }}>{testStatus}</span>}
              {testEmailEndpoint && (
                <button type="button" onClick={sendTest} disabled={sendingTest} className="luxe-btn luxe-btn-ghost" style={{ fontSize: 12, padding: '6px 10px' }}>
                  {sendingTest ? 'Sending…' : 'Send test to my email'}
                </button>
              )}
              {htmlPreviewConfig && (
                <a
                  href={`${htmlPreviewConfig.previewUrl}${htmlPreviewConfig.previewUrl.includes('?') ? '&' : '?'}preview=${htmlPreviewKey}`}
                  target="_blank"
                  rel="noreferrer"
                  className="luxe-btn luxe-btn-ghost"
                  style={{ fontSize: 12, padding: '6px 10px', textDecoration: 'none' }}
                >
                  Open in new tab
                </a>
              )}
              <span style={{ color: '#667168', fontSize: 12 }}>
                {pdfPreviewEndpoint ? 'Live PDF preview' : htmlPreviewConfig ? 'Live storefront preview' : 'Live mock preview'}
              </span>
            </div>
          </div>
          <PreviewFrame
            kind={preview}
            settings={settings}
            pdfPreviewEndpoint={pdfPreviewEndpoint}
            pdfUrl={pdfUrl}
            pdfLoading={pdfLoading}
            htmlPreviewConfig={htmlPreviewConfig}
            htmlPreviewKey={htmlPreviewKey}
            htmlPreviewLoading={htmlPreviewLoading}
          />
        </section>
      </div>
    </div>
  )
}

function FieldControl({
  field, value, settings = {}, customPresets = [], onChange, onSaveCustomPreset, onDeleteCustomPreset,
}: {
  field: ThemeField
  value: any
  settings?: Record<string, any>
  customPresets?: Array<{ label: string; value: string }>
  onChange: (value: any) => void
  onSaveCustomPreset?: (label: string) => void
  onDeleteCustomPreset?: (index: number) => void
}) {
  const [savingPreset, setSavingPreset] = useState(false)
  const [presetLabel, setPresetLabel] = useState('')
  const disabled = field.disabledWhen ? field.disabledWhen(settings) : false
  const disabledHelp = disabled ? field.disabledReason : ''
  const disabledStyle: CSSProperties = disabled ? { opacity: 0.55 } : {}

  if (field.type === 'toggle') {
    const checked = Boolean(value)
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', ...disabledStyle }}>
        <div>
          <label style={{ color: '#3a4339', fontSize: 13, fontWeight: 800 }}>{field.label}</label>
          {field.help && <p style={{ margin: '3px 0 0', color: '#7a857d', fontSize: 11 }}>{field.help}</p>}
          {disabledHelp && <p style={{ margin: '3px 0 0', color: '#8a5a00', fontSize: 11, fontWeight: 700 }}>{disabledHelp}</p>}
        </div>
        <button
          type="button"
          onClick={() => { if (!disabled) onChange(!checked) }}
          disabled={disabled}
          aria-pressed={checked}
          style={{
            width: 46,
            height: 25,
            border: 0,
            borderRadius: 999,
            background: checked ? '#1a6d3e' : '#cbd6ce',
            position: 'relative',
            cursor: disabled ? 'not-allowed' : 'pointer',
            flex: '0 0 auto',
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3,
            left: checked ? 24 : 3,
            width: 19,
            height: 19,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 140ms ease',
          }} />
        </button>
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div style={disabledStyle}>
        <label style={smallLabel}>{field.label}</label>
        <select value={value ?? ''} disabled={disabled} onChange={event => onChange(event.target.value)} style={{ ...input, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          {(field.options || []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {field.help && <p style={{ margin: '5px 0 0', color: '#7a857d', fontSize: 11 }}>{field.help}</p>}
        {disabledHelp && <p style={{ margin: '5px 0 0', color: '#8a5a00', fontSize: 11, fontWeight: 700 }}>{disabledHelp}</p>}
      </div>
    )
  }

  if (field.type === 'range') {
    const numeric = Number(value ?? field.min ?? 0)
    return (
      <div style={disabledStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
          <label style={{ color: '#3a4339', fontSize: 13, fontWeight: 800 }}>{field.label}</label>
          <span style={{ fontSize: 12, color: '#151a17', fontWeight: 850 }}>{numeric}{field.unit || ''}</span>
        </div>
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step || 1}
          value={numeric}
          disabled={disabled}
          onChange={event => onChange(Number(event.target.value))}
          style={{ width: '100%', accentColor: '#1a6d3e', cursor: disabled ? 'not-allowed' : 'pointer' }}
        />
        {field.help && <p style={{ margin: '5px 0 0', color: '#7a857d', fontSize: 11 }}>{field.help}</p>}
        {disabledHelp && <p style={{ margin: '5px 0 0', color: '#8a5a00', fontSize: 11, fontWeight: 700 }}>{disabledHelp}</p>}
      </div>
    )
  }

  if (field.type === 'color') {
    return (
      <div>
        <label style={smallLabel}>{field.label}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: 8 }}>
          <input type="color" value={String(value || '#000000')} onChange={event => onChange(event.target.value)} style={{ width: 42, height: 38, padding: 0, border: '1px solid #ccd6cf', borderRadius: 6, background: '#fff' }} />
          <input value={String(value || '')} onChange={event => onChange(event.target.value)} style={{ ...input, fontFamily: 'Consolas, monospace' }} />
        </div>
        {field.help && <p style={{ margin: '5px 0 0', color: '#7a857d', fontSize: 11 }}>{field.help}</p>}
      </div>
    )
  }

  if (field.type === 'image') {
    return (
      <ImagePickerField label={field.label} value={String(value || '')} onChange={onChange} aspectRatio={field.aspectRatio || '3 / 1'} />
    )
  }

  if (field.type === 'textarea') {
    const hasPresets = (field.textPresets && field.textPresets.length > 0) || customPresets.length > 0
    return (
      <div>
        <label style={smallLabel}>{field.label}</label>
        {hasPresets && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 7 }}>
            {(field.textPresets || []).map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.value)}
                title={preset.value}
                style={{
                  border: value === preset.value ? '1px solid #1a6d3e' : '1px solid #dfe6df',
                  background: value === preset.value ? '#eef6f1' : '#fbfcfa',
                  color: value === preset.value ? '#145c35' : '#3a4339',
                  borderRadius: 999,
                  padding: '5px 11px',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {preset.label}
              </button>
            ))}
            {customPresets.map((preset, index) => (
              <span
                key={`custom-${index}-${preset.label}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  border: value === preset.value ? '1px solid #8a5a00' : '1px solid #efd48c',
                  background: value === preset.value ? '#fff2cf' : '#fff9ec',
                  borderRadius: 999,
                  paddingRight: 3,
                }}
              >
                <button
                  type="button"
                  onClick={() => onChange(preset.value)}
                  title={preset.value}
                  style={{ border: 0, background: 'transparent', color: '#8a5a00', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: '5px 4px 5px 11px' }}
                >
                  {preset.label}
                </button>
                {onDeleteCustomPreset && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomPreset(index)}
                    aria-label={`Remove preset ${preset.label}`}
                    style={{ border: 0, background: 'transparent', color: '#8a5a00', fontSize: 13, fontWeight: 900, cursor: 'pointer', padding: '2px 6px', lineHeight: 1 }}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        <textarea value={String(value || '')} rows={field.rows || 4} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} style={{ ...input, minHeight: 92, resize: 'vertical', lineHeight: 1.45 }} />
        {onSaveCustomPreset && (
          savingPreset ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
              <input
                autoFocus
                value={presetLabel}
                onChange={event => setPresetLabel(event.target.value)}
                placeholder="Preset name"
                style={{ ...input, flex: 1, padding: '6px 9px', fontSize: 12 }}
                onKeyDown={event => {
                  if (event.key === 'Enter' && presetLabel.trim()) {
                    onSaveCustomPreset(presetLabel.trim())
                    setPresetLabel('')
                    setSavingPreset(false)
                  }
                }}
              />
              <button
                type="button"
                onClick={() => { if (presetLabel.trim()) { onSaveCustomPreset(presetLabel.trim()); setPresetLabel(''); setSavingPreset(false) } }}
                className="luxe-btn luxe-btn-primary"
                style={{ fontSize: 11, padding: '6px 10px' }}
              >
                Save
              </button>
              <button type="button" onClick={() => { setSavingPreset(false); setPresetLabel('') }} className="luxe-btn luxe-btn-ghost" style={{ fontSize: 11, padding: '6px 10px' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSavingPreset(true)}
              style={{ marginTop: 7, border: '1px dashed #b9c3ba', background: 'transparent', color: '#5a655c', borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              + Save current text as a preset
            </button>
          )
        )}
        {field.help && <p style={{ margin: '5px 0 0', color: '#7a857d', fontSize: 11 }}>{field.help}</p>}
      </div>
    )
  }

  return (
    <div>
      <label style={smallLabel}>{field.label}</label>
      <input value={String(value || '')} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} style={input} />
      {field.help && <p style={{ margin: '5px 0 0', color: '#7a857d', fontSize: 11 }}>{field.help}</p>}
    </div>
  )
}

function PreviewFrame({
  kind, settings, pdfPreviewEndpoint, pdfUrl, pdfLoading, htmlPreviewConfig, htmlPreviewKey, htmlPreviewLoading,
}: {
  kind: PreviewKind
  settings: Record<string, any>
  pdfPreviewEndpoint?: string
  pdfUrl?: string | null
  pdfLoading?: boolean
  htmlPreviewConfig?: { draftEndpoint: string; buildDraftPayload: (settings: Record<string, any>) => object; previewUrl: string }
  htmlPreviewKey?: number
  htmlPreviewLoading?: boolean
}) {
  if (pdfPreviewEndpoint) {
    return (
      <div style={{ ...panel, background: '#f5f7f4', padding: 0, minHeight: 780, position: 'relative' }}>
        {pdfLoading && (
          <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, fontWeight: 700, color: '#667168', background: '#fff', padding: '4px 9px', borderRadius: 999, border: '1px solid #dfe6df', zIndex: 1 }}>
            Updating preview…
          </div>
        )}
        {pdfUrl ? (
          <iframe src={pdfUrl} title="PDF preview" style={{ width: '100%', height: 780, border: 0, display: 'block' }} />
        ) : (
          <div style={{ padding: 60, textAlign: 'center', color: '#7a857d', fontSize: 13 }}>Generating preview…</div>
        )}
      </div>
    )
  }

  if (htmlPreviewConfig) {
    const src = `${htmlPreviewConfig.previewUrl}${htmlPreviewConfig.previewUrl.includes('?') ? '&' : '?'}preview=${htmlPreviewKey || 0}`
    return (
      <div style={{ ...panel, background: '#eef1ed', padding: 20, minHeight: 780, display: 'grid', placeItems: 'center', position: 'relative' }}>
        {htmlPreviewLoading && (
          <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, fontWeight: 700, color: '#667168', background: '#fff', padding: '4px 9px', borderRadius: 999, border: '1px solid #dfe6df', zIndex: 1 }}>
            Updating preview…
          </div>
        )}
        <div style={{ width: 390, maxWidth: '100%', background: '#111', borderRadius: 28, padding: 10, boxShadow: '0 22px 50px rgba(0,0,0,0.22)' }}>
          <div style={{ borderRadius: 20, overflow: 'hidden', background: '#fff' }}>
            <iframe key={htmlPreviewKey} src={src} title="Live mobile storefront preview" style={{ width: '100%', height: 700, border: 0, display: 'block' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...panel, background: '#f5f7f4', padding: 18, minHeight: 560 }}>
      {kind === 'product' && <ProductPreview settings={settings} />}
      {kind === 'account' && <AccountPreview settings={settings} />}
      {kind === 'mobile' && <MobilePreview settings={settings} />}
      {kind === 'global' && <GlobalPreview settings={settings} />}
      {kind === 'quotation' && <QuotationPreview settings={settings} />}
    </div>
  )
}

function ProductPreview({ settings }: { settings: Record<string, any> }) {
  const accent = '#1a6d3e'
  const gap = Number(settings.layoutGap || 40)
  const columns = Number(settings.columns || 4)
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ background: '#fff', border: '1px solid #dde5dc', borderRadius: 8, padding: 18 }}>
        {settings.showBreadcrumbs !== false && <div style={{ color: '#7b847d', fontSize: 12, marginBottom: 14 }}>Home / Sofas / Aalto Modern Sofa</div>}
        <div style={{ display: 'grid', gridTemplateColumns: `${settings.galleryWidth || 50}% 1fr`, gap }}>
          <div style={{ aspectRatio: '1/1', background: '#f1eee8', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#8b8172', fontSize: 13 }}>Product gallery</div>
          <div>
            <h3 style={{ margin: 0, color: '#151a17', fontSize: 22 }}>Aalto Modern Sofa</h3>
            {settings.showSku !== false && <p style={{ color: '#8a958d', fontSize: 12, margin: '6px 0' }}>SKU AAL-SOFA-001</p>}
            <strong style={{ display: 'block', fontSize: 20, margin: '12px 0', color: '#151a17' }}>PHP 128,184</strong>
            <button style={{ background: accent, color: '#fff', border: 0, borderRadius: 6, padding: '11px 16px', fontWeight: 850 }}>{settings.buttonText || 'Request Quote'}</button>
            <div style={{ display: 'grid', gap: 7, marginTop: 18, color: '#4b554e', fontSize: 13 }}>
              {settings.showMaterials !== false && <span>Materials: solid wood, linen blend</span>}
              {settings.showDimensions !== false && <span>Dimensions: 220 x 92 x 78 cm</span>}
              {settings.enableZoom !== false && <span>Gallery zoom enabled</span>}
            </div>
          </div>
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #dde5dc', borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <strong style={{ fontSize: 13 }}>Collection grid</strong>
          <span style={{ color: '#667168', fontSize: 12 }}>{settings.showFilters !== false ? 'Filters shown' : 'Filters hidden'} / {settings.showSort !== false ? 'Sort shown' : 'Sort hidden'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(2, Math.min(columns, 5))}, 1fr)`, gap: Math.min(Number(settings.gridGap || 24), 38) }}>
          {[1, 2, 3, 4].map(index => (
            <div key={index} style={{ border: '1px solid #edf0ec', borderRadius: 7, padding: 8 }}>
              <div style={{ aspectRatio: '1/1', background: '#f2f0eb', borderRadius: 5 }} />
              <div style={{ height: 8, background: '#d9ded8', borderRadius: 99, marginTop: 8 }} />
              {settings.showRating !== false && <div style={{ color: '#b88935', fontSize: 10, marginTop: 5 }}>Rated 5.0</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AccountPreview({ settings }: { settings: Record<string, any> }) {
  const radius = Number(settings.radius || 8)
  const shadow = settings.cardStyle === 'flat' ? 'none' : '0 12px 26px rgba(21,26,23,0.08)'
  const surface = settings.surfaceColor || '#f7f4ee'
  const panelColor = settings.panelColor || '#fff'
  const text = settings.textColor || '#151a17'
  const muted = settings.mutedColor || '#6f766f'
  const accent = settings.accentColor || '#1a6d3e'
  return (
    <div style={{ background: surface, borderRadius: radius + 6, border: `1px solid ${settings.borderColor || '#ddd7cb'}`, minHeight: 520, display: 'grid', gridTemplateColumns: settings.navStyle === 'tabs' ? '1fr' : '180px 1fr', overflow: 'hidden' }}>
      {settings.navStyle !== 'tabs' && (
        <aside style={{ background: panelColor, borderRight: `1px solid ${settings.borderColor || '#ddd7cb'}`, padding: 18 }}>
          <strong style={{ color: accent, fontSize: 12 }}>{settings.welcomeLabel || 'My HomeU'}</strong>
          {['Dashboard', 'RFQs', 'Quotations', 'Addresses'].map((item, index) => (
            <div key={item} style={{ marginTop: 10, padding: 9, borderRadius: radius, color: index === 0 ? accent : muted, background: index === 0 ? surface : 'transparent', fontSize: 12, fontWeight: 750 }}>{item}</div>
          ))}
        </aside>
      )}
      <main style={{ padding: settings.density === 'compact' ? 18 : 26, color: text }}>
        <span style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>{settings.welcomeLabel || 'My HomeU'}</span>
        <h3 style={{ margin: '5px 0 18px', fontSize: 24 }}>Welcome back, Maria</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {['Active projects', 'Awaiting decision'].map((item, index) => (
            <div key={item} style={{ background: panelColor, borderRadius: radius, boxShadow: shadow, border: `1px solid ${settings.borderColor || '#ddd7cb'}`, padding: 16 }}>
              <strong style={{ display: 'block', color: text, fontSize: 24 }}>{index === 0 ? 3 : 1}</strong>
              <span style={{ color: muted, fontSize: 11, textTransform: 'uppercase', fontWeight: 800 }}>{item}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, background: panelColor, borderRadius: radius, boxShadow: shadow, border: `1px solid ${settings.borderColor || '#ddd7cb'}`, padding: 16 }}>
          <strong>RFQ #A18F2C</strong>
          <p style={{ color: muted, margin: '5px 0 12px', fontSize: 13 }}>Dining room set updated 2h ago</p>
          <button style={{ background: accent, color: '#fff', border: 0, borderRadius: radius, padding: '9px 13px', fontWeight: 800 }}>Open chat</button>
        </div>
      </main>
    </div>
  )
}

function MobilePreview({ settings }: { settings: Record<string, any> }) {
  const modern = settings.bottomBarStyle !== 'classic'
  return (
    <div style={{ width: 390, maxWidth: '100%', margin: '0 auto', background: '#111', borderRadius: 28, padding: 10, boxShadow: '0 22px 50px rgba(0,0,0,0.22)' }}>
      <div style={{ minHeight: 650, background: '#fff', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: 14, borderBottom: '1px solid #eee', position: settings.stickyHeader ? 'sticky' : 'static', top: 0, background: '#fff', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 900 }}>HomeU</span>
            <span style={{ color: '#667168', fontSize: 12 }}>{settings.mobileNavStyle === 'debut' ? 'Menu' : 'Tabs'}</span>
          </div>
          {settings.showSearch && <div style={{ marginTop: 10, background: '#f4f6f2', borderRadius: 999, padding: '9px 12px', color: '#7a857d', fontSize: 12 }}>Search products, sofas, lighting</div>}
        </header>
        <main style={{ flex: 1, padding: 14, display: 'grid', gap: 14 }}>
          {settings.mobileNavStyle === 'tabs' && settings.heroStyle !== 'minimal' && (
            <section style={{ background: '#f7f4ee', borderRadius: 14, padding: 16 }}>
              <strong style={{ fontSize: 20 }}>Modern interiors</strong>
              <p style={{ color: '#667168', margin: '5px 0 0', fontSize: 13 }}>Browse curated furniture for your project.</p>
            </section>
          )}
          {settings.quickActionPills && <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>{['RFQ', 'Sofas', 'Dining'].map(item => <span key={item} style={{ background: '#151a17', color: '#fff', borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 800 }}>{item}</span>)}</div>}
          {settings.categoryChips && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{['Living', 'Bedroom', 'Office', 'Lighting'].map(item => <div key={item} style={{ background: '#f6f7f5', border: '1px solid #edf0ec', borderRadius: 10, padding: 14, fontSize: 13, fontWeight: 800 }}>{item}</div>)}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{[1, 2, 3, 4].map(item => <div key={item} style={{ border: '1px solid #edf0ec', borderRadius: 10, padding: 8 }}><div style={{ aspectRatio: '1/1', background: '#f1eee8', borderRadius: 8 }} /><div style={{ height: 8, background: '#d7ded7', borderRadius: 99, marginTop: 8 }} /></div>)}</div>
        </main>
        {settings.showBottomBar && settings.mobileNavStyle === 'tabs' && (
          <nav style={{ margin: modern ? '0 14px 12px' : 0, borderRadius: modern ? 18 : 0, background: '#151a17', color: '#fff', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', padding: modern ? '8px 4px' : '10px 4px' }}>
            {['Home', 'Shop', 'RFQ', 'Acct', 'Menu'].map(item => <span key={item} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800 }}>{item}</span>)}
          </nav>
        )}
      </div>
    </div>
  )
}

function GlobalPreview({ settings }: { settings: Record<string, any> }) {
  const primary = settings.primaryColor || '#1a6d3e'
  const secondary = settings.secondaryColor || '#151a17'
  const accent = settings.accentColor || '#b88935'
  const bg = settings.bodyBg || '#f7f4ee'
  const radius = Number(settings.buttonRadius || 8)
  return (
    <div style={{ background: bg, borderRadius: 8, padding: 22, color: settings.textColor || '#151a17', fontFamily: settings.bodyFont || 'Inter, sans-serif' }}>
      <h3 style={{ margin: 0, fontFamily: settings.headingFont || 'Georgia, serif', fontSize: 28, color: secondary }}>Global storefront style</h3>
      <p style={{ color: settings.mutedColor || '#667168', maxWidth: 520 }}>Colors, typography, buttons, and layout rhythm applied across the storefront.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0' }}>
        {[primary, secondary, accent, settings.borderColor || '#d9e0d7'].map(color => <span key={color} style={{ width: 48, height: 48, borderRadius: 8, background: color, border: '1px solid rgba(0,0,0,0.08)' }} />)}
      </div>
      <button style={{ background: primary, color: '#fff', border: 0, borderRadius: radius, padding: '11px 16px', fontWeight: 850, textTransform: settings.buttonUppercase ? 'uppercase' : 'none' }}>Primary button</button>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: Number(settings.sectionGap || 24) / 2 }}>
        {[1, 2, 3].map(item => <div key={item} style={{ background: '#fff', border: `1px solid ${settings.borderColor || '#d9e0d7'}`, borderRadius: 8, padding: 14 }}><strong>Section {item}</strong><p style={{ color: '#667168', fontSize: 12 }}>Preview content</p></div>)}
      </div>
    </div>
  )
}

function QuotationPreview({ settings }: { settings: Record<string, any> }) {
  const brand = settings.brandColor || '#1a6d3e'
  const accent = settings.accentColor || '#b88935'
  return (
    <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', background: '#fff', border: '1px solid #d9e0d7', minHeight: 620, padding: 30, fontFamily: settings.fontFamily || 'Inter, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {settings.showWatermark && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(0,0,0,0.06)', fontSize: 72, fontWeight: 900, transform: 'rotate(-24deg)' }}>{settings.watermarkText || 'DRAFT'}</div>}
      <div style={{ position: 'relative' }}>
        {settings.template === 'modern' && <div style={{ height: 8, background: brand, borderRadius: 999, marginBottom: 20 }} />}
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, borderBottom: '1px solid #e5e7e2', paddingBottom: 18 }}>
          <div>
            {settings.showHeaderLogo && (
              settings.headerLogo
                ? <img src={settings.headerLogo} alt="" style={{ width: 130, height: 44, objectFit: 'contain', objectPosition: 'left', marginBottom: 10, display: 'block' }} />
                : <div style={{ width: 52, height: 52, borderRadius: 8, background: brand, marginBottom: 10 }} />
            )}
            {settings.showCompanyName && <strong style={{ color: '#151a17', fontSize: 18 }}>Home Atelier</strong>}
            {settings.showAddress && <p style={{ color: '#667168', fontSize: 12, margin: '5px 0 0' }}>Makati, Metro Manila</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, color: brand, fontSize: 24 }}>Quotation</h3>
            <p style={{ margin: '6px 0 0', color: '#667168', fontSize: 12 }}>Q-2026-0148</p>
          </div>
        </header>
        <section style={{ marginTop: 24 }}>
          <strong>Prepared for Maria Santos</strong>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18, fontSize: 12 }}>
            <thead><tr style={{ background: settings.template === 'minimal' ? '#fff' : '#f7f4ee', color: '#3a4339' }}>
              {settings.showItemImages !== false && <th style={{ textAlign: 'left', padding: 10, width: 44 }}>Img</th>}
              <th style={{ textAlign: 'left', padding: 10 }}>Item</th>
              {settings.showUnitPrice !== false && <th style={{ textAlign: 'right', padding: 10 }}>Unit</th>}
              <th style={{ textAlign: 'right', padding: 10 }}>Total</th>
            </tr></thead>
            <tbody>{['Aalto Modern Sofa', 'Augustin Pouf', 'Delivery and handling'].map((item, index) => (
              <tr key={item} style={{ borderBottom: '1px solid #edf0ec' }}>
                {settings.showItemImages !== false && <td style={{ padding: 10 }}><div style={{ width: 24, height: 24, borderRadius: 4, background: '#eee' }} /></td>}
                <td style={{ padding: 10 }}>{item}</td>
                {settings.showUnitPrice !== false && <td style={{ padding: 10, textAlign: 'right', color: '#8a958d' }}>PHP {[128184, 32000, 6500][index].toLocaleString('en-PH')}</td>}
                <td style={{ padding: 10, textAlign: 'right' }}>PHP {[128184, 32000, 6500][index].toLocaleString('en-PH')}</td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}><strong style={{ color: accent, fontSize: 18 }}>PHP 166,684</strong></div>
        </section>
        {settings.showTerms && <section style={{ marginTop: 26, background: '#fafbf9', border: '1px solid #edf0ec', borderRadius: 8, padding: 14, color: '#667168', fontSize: 11 }}>{settings.termsText}</section>}
        <footer style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', color: '#667168', fontSize: 11 }}>
          <span>{settings.footerText || 'Thank you for choosing Home Atelier'}</span>
          {settings.showPageNumbers && <span>Page 1</span>}
        </footer>
      </div>
    </div>
  )
}
