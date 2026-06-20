/**
 * DynamicSettingsForm.tsx
 * ========================
 * Auto-renders form controls from a SettingDefinition[] array.
 * Supports ALL 12 setting types defined in theme-builder-settings.ts.
 *
 * Drop this into ThemeEditor.tsx instead of the old renderField():
 *   <DynamicSettingsForm
 *     settings={getSectionSettings(sec.type)}
 *     config={sec.config}
 *     onChange={(key, value) => setConfig(sec.id, key, value)}
 *   />
 */

'use client'

import type { SettingDefinition } from '@/lib/theme-builder-settings'

// ── Shared Style Constants ────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #d9e0d7',
  borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
  background: '#fbfcfa', color: '#151a17', outline: 'none',
  boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#3a4339', marginBottom: 5,
}
const groupStyle: React.CSSProperties = {
  marginBottom: 12, padding: '8px 0',
}
const groupTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: '#9aa69c',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #eef1ed',
}

// ── Props ─────────────────────────────────────────────────────────────────

interface DynamicSettingsFormProps {
  settings: SettingDefinition[]
  config: Record<string, any>
  onChange: (key: string, value: any) => void
  /** Optional media picker opener: returns a promise that resolves to URL */
  onOpenMediaPicker?: (currentUrl: string) => Promise<string | null>
  /** Optional product picker */
  onOpenProductPicker?: (currentIds: number[]) => Promise<number[]>
  /** Optional collection picker */
  onOpenCollectionPicker?: (currentSlugs: string[]) => Promise<string[]>
}

// ── Individual Field Renderers ────────────────────────────────────────────

function TextField({ setting, value, onChange }: {
  setting: SettingDefinition; value: string; onChange: (v: string) => void
}) {
  return (
    <input
      style={inputBase}
      type="text"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={setting.placeholder}
    />
  )
}

function TextareaField({ setting, value, onChange }: {
  setting: SettingDefinition; value: string; onChange: (v: string) => void
}) {
  return (
    <textarea
      style={{ ...inputBase, minHeight: 80, resize: 'vertical' }}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={setting.placeholder}
    />
  )
}

function NumberField({ setting, value, onChange }: {
  setting: SettingDefinition; value: number; onChange: (v: number) => void
}) {
  return (
    <input
      style={inputBase}
      type="number"
      value={value ?? setting.default ?? 0}
      onChange={e => onChange(parseInt(e.target.value, 10) || 0)}
      min={setting.min}
      max={setting.max}
      step={setting.step}
      placeholder={setting.placeholder}
    />
  )
}

function ColorField({ setting, value, onChange }: {
  setting: SettingDefinition; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="color"
        value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
        style={{ width: 40, height: 40, padding: 2, border: '1.5px solid #d9e0d7', borderRadius: 8, cursor: 'pointer', background: 'none' }}
      />
      <input
        style={{ ...inputBase, flex: 1 }}
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={setting.placeholder || '#hex'}
      />
    </div>
  )
}

function RangeField({ setting, value, onChange }: {
  setting: SettingDefinition; value: number; onChange: (v: number) => void
}) {
  const min = setting.min ?? 0
  const max = setting.max ?? 100
  const step = setting.step ?? 1
  const num = Number(value) ?? Number(setting.default) ?? 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={num}
        onChange={e => onChange(parseInt(e.target.value, 10))}
        style={{ flex: 1, accentColor: '#1a6d3e' }}
      />
      <span style={{ fontSize: 13, fontWeight: 700, color: '#151a17', minWidth: 48, textAlign: 'right', whiteSpace: 'nowrap' }}>
        {num}{setting.unit || ''}
      </span>
    </div>
  )
}

function SelectField({ setting, value, onChange }: {
  setting: SettingDefinition; value: string; onChange: (v: string) => void
}) {
  return (
    <select
      style={inputBase}
      value={value ?? setting.default ?? ''}
      onChange={e => onChange(e.target.value)}
    >
      {(setting.options || []).map(opt => (
        <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
      ))}
    </select>
  )
}

function CheckboxField({ setting, value, onChange }: {
  setting: SettingDefinition; value: boolean; onChange: (v: boolean) => void
}) {
  const checked = value ?? setting.default ?? false
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3a4339', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: '#1a6d3e', width: 16, height: 16 }}
      />
      {setting.label}
      {setting.hint && <span style={{ fontSize: 11, color: '#9aa69c' }}>— {setting.hint}</span>}
    </label>
  )
}

function ImagePickerField({ setting, value, onChange, onOpenMediaPicker }: {
  setting: SettingDefinition; value: string; onChange: (v: string) => void
  onOpenMediaPicker?: (currentUrl: string) => Promise<string | null>
}) {
  return (
    <div>
      {value ? (
        <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #eef1ed', position: 'relative', maxWidth: 240 }}>
          <img src={value} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
          <button
            onClick={() => onChange('')}
            style={{ position: 'absolute', top: 4, right: 4, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14, lineHeight: '24px', textAlign: 'center' }}
          >×</button>
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...inputBase, flex: 1 }}
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={setting.placeholder || 'Image URL…'}
        />
        {onOpenMediaPicker && (
          <button
            onClick={async () => {
              const url = await onOpenMediaPicker(value ?? '')
              if (url) onChange(url)
            }}
            style={{
              padding: '8px 14px', border: '1.5px solid #9cc4a9', borderRadius: 8,
              background: '#f0f7f2', color: '#1e7a47', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >📷 Browse</button>
        )}
      </div>
      {setting.hint && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9aa69c' }}>{setting.hint}</p>}
    </div>
  )
}

function FontPickerField({ setting, value, onChange }: {
  setting: SettingDefinition; value: string; onChange: (v: string) => void
}) {
  return (
    <select
      style={inputBase}
      value={value ?? setting.default ?? ''}
      onChange={e => onChange(e.target.value)}
    >
      {(setting.options || []).map(opt => (
        <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
      ))}
    </select>
  )
}

function AlignmentField({ setting, value, onChange }: {
  setting: SettingDefinition; value: string; onChange: (v: string) => void
}) {
  const options = setting.options || [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
    { label: 'Right', value: 'right' },
  ]
  const current = value ?? setting.default ?? 'center'
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(opt => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(String(opt.value))}
          style={{
            flex: 1, padding: '8px 6px', border: current === opt.value ? '2px solid #1a6d3e' : '1.5px solid #d9e0d7',
            borderRadius: 6, background: current === opt.value ? '#f0f7f2' : '#fff',
            color: '#151a17', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          {opt.label === 'Left' ? '≡' : opt.label === 'Center' ? '≡' : '≡'}{' '}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function LinkField({ setting, value, onChange }: {
  setting: SettingDefinition; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        style={{ ...inputBase, flex: 1 }}
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={setting.placeholder || '/products'}
      />
      <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: '#9aa69c' }}>🔗</span>
    </div>
  )
}

function RepeaterField({ setting, value, onChange }: {
  setting: SettingDefinition; value: any[]; onChange: (v: any[]) => void
}) {
  const items = Array.isArray(value) ? value : []
  const subSettings = setting.itemSettings || []
  const maxItems = setting.maxItems ?? Infinity

  function updateItem(idx: number, key: string, val: any) {
    const next = [...items]
    next[idx] = { ...next[idx], [key]: val }
    onChange(next)
  }

  function addItem() {
    if (items.length >= maxItems) return
    const defaults: Record<string, any> = {}
    for (const s of subSettings) defaults[s.key] = s.default
    onChange([...items, defaults])
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <div>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            border: '1px solid #eef1ed', borderRadius: 8, padding: 12,
            marginBottom: 8, position: 'relative', background: '#fafbf9',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {subSettings.map(sub => {
              const isFullWidth = sub.type === 'textarea' || sub.type === 'image_picker' || sub.type === 'repeater'
              return (
                <div key={sub.key} style={{ gridColumn: isFullWidth ? '1 / -1' : 'auto' }}>
                  <label style={{ ...labelStyle, fontSize: 11 }}>{sub.label}</label>
                  <DynamicField
                    setting={sub}
                    value={item[sub.key]}
                    onChange={(val) => updateItem(idx, sub.key, val)}
                  />
                </div>
              )
            })}
          </div>
          <button
            onClick={() => removeItem(idx)}
            style={{ position: 'absolute', top: 6, right: 6, border: 'none', background: 'transparent', color: '#b0392f', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >✕ Remove</button>
        </div>
      ))}
      {items.length < maxItems && (
        <button
          onClick={addItem}
          style={{
            padding: '7px 14px', background: '#f0f7f2', border: '1.5px dashed #9cc4a9',
            color: '#1e7a47', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', width: '100%',
          }}
        >+ Add {setting.label}</button>
      )}
    </div>
  )
}

// ── DynamicField — routes to the correct renderer ─────────────────────────

function DynamicField({ setting, value, onChange, ...extra }: {
  setting: SettingDefinition; value: any; onChange: (v: any) => void
  onOpenMediaPicker?: (currentUrl: string) => Promise<string | null>
}) {
  // Check condition: if this field has a condition, hide it when condition not met
  // (The parent should filter; this is a safety check)
  if (setting.type === 'text' || setting.type === 'collection_picker') {
    return <TextField setting={setting} value={value ?? ''} onChange={onChange} />
  }
  if (setting.type === 'textarea') return <TextareaField setting={setting} value={value ?? ''} onChange={onChange} />
  if (setting.type === 'number') return <NumberField setting={setting} value={value ?? 0} onChange={onChange} />
  if (setting.type === 'color') return <ColorField setting={setting} value={value ?? ''} onChange={onChange} />
  if (setting.type === 'range') return <RangeField setting={setting} value={value ?? setting.default ?? 0} onChange={onChange} />
  if (setting.type === 'select') return <SelectField setting={setting} value={value ?? ''} onChange={onChange} />
  if (setting.type === 'checkbox') return <CheckboxField setting={setting} value={value ?? false} onChange={onChange} />
  if (setting.type === 'image_picker') return <ImagePickerField setting={setting} value={value ?? ''} onChange={onChange} onOpenMediaPicker={extra.onOpenMediaPicker} />
  if (setting.type === 'font_picker') return <FontPickerField setting={setting} value={value ?? ''} onChange={onChange} />
  if (setting.type === 'alignment') return <AlignmentField setting={setting} value={value ?? ''} onChange={onChange} />
  if (setting.type === 'link') return <LinkField setting={setting} value={value ?? ''} onChange={onChange} />
  if (setting.type === 'repeater') return <RepeaterField setting={setting} value={value ?? []} onChange={onChange} />
  if (setting.type === 'icon_picker') return <TextField setting={setting} value={value ?? ''} onChange={onChange} />
  if (setting.type === 'product_picker') return <TextField setting={setting} value={value ?? ''} onChange={onChange} />

  // Fallback
  return <TextField setting={setting} value={String(value ?? '')} onChange={onChange} />
}

// ── Main Export ───────────────────────────────────────────────────────────

export default function DynamicSettingsForm({
  settings, config, onChange, onOpenMediaPicker,
}: DynamicSettingsFormProps) {
  // Group settings by their `group` property
  const grouped: Record<string, SettingDefinition[]> = {}
  const ungrouped: SettingDefinition[] = []

  for (const s of settings) {
    // Check condition — hide if condition not met
    if (s.condition) {
      const condVal = config[s.condition.key]
      if (condVal !== s.condition.value) continue
    }
    if (s.group) {
      if (!grouped[s.group]) grouped[s.group] = []
      grouped[s.group].push(s)
    } else {
      ungrouped.push(s)
    }
  }

  function renderSetting(s: SettingDefinition) {
    const val = config[s.key] !== undefined ? config[s.key] : s.default
    return (
      <div key={s.key} style={{ marginBottom: s.type === 'repeater' ? 20 : 14 }}>
        {s.type !== 'checkbox' && (
          <label style={labelStyle}>
            {s.label}
            {s.hint && !s.condition && <span style={{ fontWeight: 400, color: '#9aa69c', marginLeft: 4 }}>({s.hint})</span>}
          </label>
        )}
        <DynamicField
          setting={s}
          value={val}
          onChange={(v) => onChange(s.key, v)}
          onOpenMediaPicker={onOpenMediaPicker}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Ungrouped settings */}
      {ungrouped.map(renderSetting)}

      {/* Grouped settings */}
      {Object.entries(grouped).map(([groupName, groupSettings]) => (
        <div key={groupName} style={groupStyle}>
          <div style={groupTitle}>{groupName}</div>
          {groupSettings.map(renderSetting)}
        </div>
      ))}
    </div>
  )
}
