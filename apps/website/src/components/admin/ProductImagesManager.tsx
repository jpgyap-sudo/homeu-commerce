'use client'

import { useState, useEffect } from 'react'
import { MediaPicker } from './MediaPicker'

interface ProductImage {
  id: number
  url: string
  alt: string | null
  sort_order: number
}

const btn: React.CSSProperties = {
  border: '1px solid #d9e0d7', background: '#fff', borderRadius: 6,
  cursor: 'pointer', fontSize: 12, color: '#3a4339', padding: '3px 7px',
}

/** Multi-image manager for a product — add via the shared MediaPicker
 *  (browse library / upload / paste URL), reorder with up/down, remove.
 *  Products previously had no image management UI in admin at all. */
export function ProductImagesManager({ productId }: { productId: number }) {
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    fetch(`/api/admin/products/${productId}/images`)
      .then(r => r.json())
      .then(d => setImages(d.images || []))
      .catch(() => setError('Failed to load images'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [productId])

  async function addImage(url: string) {
    setPickerOpen(false)
    setError('')
    const res = await fetch(`/api/admin/products/${productId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (res.ok) load()
    else setError('Failed to add image')
  }

  async function removeImage(imageId: number) {
    setImages(prev => prev.filter(i => i.id !== imageId)) // optimistic
    const res = await fetch(`/api/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' })
    if (!res.ok) load() // revert on failure
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= images.length) return
    const next = [...images]
    ;[next[index], next[target]] = [next[target], next[index]]
    setImages(next) // optimistic
    await fetch(`/api/admin/products/${productId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: next.map(i => i.id) }),
    })
  }

  if (loading) return <p style={{ color: '#9aa69c', fontSize: 13 }}>Loading images…</p>

  return (
    <div>
      {error && <p style={{ color: '#b0392f', fontSize: 12, marginBottom: 8 }}>{error}</p>}

      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
          {images.map((img, idx) => (
            <div key={img.id} style={{ position: 'relative', border: '1px solid #eef1ed', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '1', background: '#f4f6f2' }}>
                <img src={img.url} alt={img.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {idx === 0 && (
                <span style={{ position: 'absolute', top: 4, left: 4, background: '#1a6d3e', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                  Main
                </span>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, padding: 4, background: '#fff' }}>
                <button type="button" style={btn} onClick={() => move(idx, -1)} disabled={idx === 0} title="Move left">←</button>
                <button type="button" style={btn} onClick={() => move(idx, 1)} disabled={idx === images.length - 1} title="Move right">→</button>
                <button type="button" style={{ ...btn, color: '#b0392f', borderColor: '#e9c5be' }} onClick={() => removeImage(img.id)} title="Remove">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        style={{
          padding: '8px 16px', border: '1.5px dashed #9cc4a9', borderRadius: 8,
          background: '#f0f7f2', color: '#1e7a47', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
        + Add image
      </button>

      <MediaPicker open={pickerOpen} onSelect={addImage} onClose={() => setPickerOpen(false)} />
    </div>
  )
}
