'use client'

import { useEffect, useState } from 'react'

interface PickerCollection {
  id: number
  title: string
  slug: string
  imageUrl: string | null
  productCount: number
}

interface CollectionPickerProps {
  open: boolean
  selectedSlugs: string[]
  multiSelect?: boolean
  maxSelections?: number
  onSelect: (slugs: string[]) => void
  onClose: () => void
}

export function CollectionPicker({
  open,
  selectedSlugs,
  multiSelect = false,
  maxSelections = 15,
  onSelect,
  onClose,
}: CollectionPickerProps) {
  const [collections, setCollections] = useState<PickerCollection[]>([])
  const [selected, setSelected] = useState<string[]>(selectedSlugs)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelected(selectedSlugs)
    setSearch('')
  }, [open, selectedSlugs])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams({ published: 'true', limit: '200' })
      if (search.trim()) params.set('search', search.trim())
      fetch(`/api/collections?${params}`)
        .then(response => response.json())
        .then(data => setCollections(data.docs || []))
        .catch(() => setCollections([]))
        .finally(() => setLoading(false))
    }, 180)
    return () => clearTimeout(timer)
  }, [open, search])

  function toggle(slug: string) {
    setSelected(current => {
      if (!multiSelect) return [slug]
      if (current.includes(slug)) return current.filter(item => item !== slug)
      if (current.length >= maxSelections) return current
      return [...current, slug]
    })
  }

  if (!open) return null

  return (
    <div className="collection-picker__backdrop" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="collection-picker" role="dialog" aria-modal="true" aria-labelledby="collection-picker-title">
        <div className="collection-picker__header">
          <div>
            <h2 id="collection-picker-title">{multiSelect ? 'Choose collections' : 'Replace collection'}</h2>
            <p>{multiSelect ? `Select and order up to ${maxSelections} homepage tiles.` : 'Choose the collection for this tile.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close collection picker">×</button>
        </div>

        <div className="collection-picker__search">
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search collections…" autoFocus />
          <span>{selected.length}/{maxSelections} selected</span>
        </div>

        <div className="collection-picker__grid">
          {loading ? <p className="collection-picker__message">Loading collections…</p> : collections.length === 0
            ? <p className="collection-picker__message">No collections found.</p>
            : collections.map(collection => {
              const active = selected.includes(collection.slug)
              return (
                <button
                  type="button"
                  key={collection.id}
                  className={`collection-picker__card${active ? ' is-selected' : ''}`}
                  onClick={() => toggle(collection.slug)}
                  aria-pressed={active}
                >
                  <span className="collection-picker__image">
                    {collection.imageUrl ? <img src={collection.imageUrl} alt="" /> : <span>No image</span>}
                  </span>
                  <span className="collection-picker__title">{collection.title}</span>
                  <span className="collection-picker__meta">{collection.productCount} products · {collection.slug}</span>
                </button>
              )
            })}
        </div>

        <div className="collection-picker__footer">
          <button type="button" className="collection-picker__cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="collection-picker__confirm" disabled={selected.length === 0} onClick={() => onSelect(selected)}>
            {multiSelect ? 'Use selected collections' : 'Replace tile'}
          </button>
        </div>
      </div>
      <style jsx>{`
        .collection-picker__backdrop { position: fixed; inset: 0; z-index: 220; display: grid; place-items: center; padding: 24px; background: rgba(15, 18, 16, .58); }
        .collection-picker { width: min(900px, 96vw); max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 16px; background: #fff; box-shadow: 0 24px 80px rgba(0, 0, 0, .3); }
        .collection-picker__header, .collection-picker__search, .collection-picker__footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 22px; border-bottom: 1px solid #e8ece7; }
        .collection-picker__header h2 { margin: 0 0 3px; color: #172019; font-size: 18px; }
        .collection-picker__header p { margin: 0; color: #6e786f; font-size: 12px; }
        .collection-picker__header button { border: 0; background: transparent; color: #657067; font-size: 26px; cursor: pointer; }
        .collection-picker__search input { flex: 1; padding: 10px 13px; border: 1.5px solid #d6ddd5; border-radius: 8px; font: inherit; }
        .collection-picker__search span { color: #637067; font-size: 12px; white-space: nowrap; }
        .collection-picker__grid { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; padding: 18px 22px; }
        .collection-picker__card { position: relative; overflow: hidden; padding: 0 0 10px; border: 2px solid #e8ece7; border-radius: 10px; background: #fff; color: #172019; text-align: left; cursor: pointer; }
        .collection-picker__card.is-selected { border-color: #1a6d3e; box-shadow: 0 0 0 2px rgba(26, 109, 62, .12); }
        .collection-picker__image { display: grid; width: 100%; aspect-ratio: 1; place-items: center; overflow: hidden; background: #eef1ed; color: #869087; font-size: 12px; }
        .collection-picker__image img { width: 100%; height: 100%; object-fit: cover; }
        .collection-picker__title, .collection-picker__meta { display: block; padding: 0 9px; }
        .collection-picker__title { margin-top: 9px; font-size: 13px; font-weight: 700; line-height: 1.25; }
        .collection-picker__meta { margin-top: 4px; color: #788279; font-size: 10px; line-height: 1.25; }
        .collection-picker__message { grid-column: 1 / -1; padding: 40px; color: #778078; text-align: center; }
        .collection-picker__footer { justify-content: flex-end; border-top: 1px solid #e8ece7; border-bottom: 0; }
        .collection-picker__footer button { padding: 9px 17px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .collection-picker__cancel { border: 1px solid #d6ddd5; background: #fff; color: #5f695f; }
        .collection-picker__confirm { border: 0; background: #1a6d3e; color: #fff; }
        .collection-picker__confirm:disabled { background: #cbd2cb; cursor: default; }
      `}</style>
    </div>
  )
}
