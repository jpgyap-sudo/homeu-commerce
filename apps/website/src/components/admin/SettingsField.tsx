'use client'

import { useState } from 'react'

interface SettingsFieldProps {
  label: string
  fieldKey: string
  type: 'text' | 'password' | 'select' | 'checkbox' | 'textarea' | 'number'
  value: string | number | boolean
  onChange: (key: string, value: any) => void
  options?: { label: string; value: string }[]
  placeholder?: string
  hint?: string
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#667168',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
  fontSize: 13, fontFamily: 'inherit', outline: 'none',
  background: '#f7f9f6', color: '#151a17', width: '100%', boxSizing: 'border-box',
}

export default function SettingsField({ label, fieldKey, type, value, onChange, options, placeholder, hint }: SettingsFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  if (type === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 0' }}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(fieldKey, e.target.checked)}
          style={{ width: 18, height: 18, accentColor: '#1a6d3e', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 13, color: '#151a17', fontWeight: 500 }}>{label}</span>
        {hint && <span style={{ fontSize: 11, color: '#9aa69c', marginLeft: 4 }}>{hint}</span>}
      </label>
    )
  }

  if (type === 'select') {
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        <select
          value={String(value)}
          onChange={e => onChange(fieldKey, e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {hint && <div style={{ fontSize: 11, color: '#9aa69c', marginTop: 4 }}>{hint}</div>}
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        <textarea
          value={String(value)}
          onChange={e => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80, fontFamily: 'monospace', fontSize: 12 }}
        />
        {hint && <div style={{ fontSize: 11, color: '#9aa69c', marginTop: 4 }}>{hint}</div>}
      </div>
    )
  }

  const isPassword = type === 'password'

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPassword && !showPassword ? 'password' : 'text'}
          value={String(value || '')}
          onChange={e => onChange(fieldKey, isPassword && !showPassword ? e.target.value : e.target.value)}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            paddingRight: isPassword ? 80 : 14,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute', right: 4, top: 4, bottom: 4,
              padding: '0 12px', border: 'none', borderRadius: 8,
              background: '#e8ece8', color: '#667168',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: '#9aa69c', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}
