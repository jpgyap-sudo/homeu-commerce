'use client'

import { useState } from 'react'
import { MediaPicker } from './MediaPicker'

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#3a4339', marginBottom: 5 }

/** Self-contained thumbnail + "Browse media" button for any single-image
 *  field outside the theme editor (categories, collections, blog featured
 *  image, etc.) — no more hand-typed/pasted URLs. Wraps the shared
 *  MediaPicker (browse DO Spaces library / upload / paste URL). */
export function ImagePickerField({
  label, value, onChange, aspectRatio = '4 / 3',
}: {
  label?: string
  value: string
  onChange: (url: string) => void
  aspectRatio?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      {label && <label style={lbl}>{label}</label>}

      {value ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio, borderRadius: 8, overflow: 'hidden', background: '#eef1ed', marginBottom: 8 }}>
          <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{ width: '100%', aspectRatio, borderRadius: 8, background: '#f3f5f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa69c', fontSize: 13, marginBottom: 8 }}>
          No image
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            flex: 1, padding: '8px 12px', border: '1.5px dashed #9cc4a9', borderRadius: 8,
            background: '#f0f7f2', color: '#1e7a47', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
          {value ? 'Change image…' : 'Browse media…'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} title="Remove image"
            style={{ border: '1.5px solid #e9c5be', background: '#fff', color: '#b0392f', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '8px 12px' }}>
            Remove
          </button>
        )}
      </div>

      <MediaPicker
        open={open}
        currentUrl={value}
        onSelect={(url) => { setOpen(false); onChange(url) }}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}
