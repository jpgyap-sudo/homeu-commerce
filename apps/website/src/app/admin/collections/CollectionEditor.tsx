'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  RULE_COLUMNS, RELATIONS_BY_KIND,
  type CollectionRule, type RuleColumn,
} from '@/lib/collection-rules'
import { ImagePickerField } from '@/components/admin/ImagePickerField'

interface ProductLite {
  id: number
  title: string
  slug: string
  price: number | null
  salePrice?: number | null
  imageUrl: string | null
  source?: string
}

export interface CollectionData {
  id?: number
  title: string
  slug?: string
  description: string
  imageUrl: string
  type: 'manual' | 'smart'
  rules: CollectionRule[]
  rulesMatch: 'all' | 'any'
  published: boolean
  featured: boolean
  position: number
  productSort: string
  seoTitle: string
  seoDescription: string
  products?: ProductLite[]
}

const SORT_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'best-selling', label: 'Best selling' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'price-asc', label: 'Price low → high' },
  { value: 'price-desc', label: 'Price high → low' },
  { value: 'created-desc', label: 'Newest first' },
]

const kindOf = (col: RuleColumn) => RULE_COLUMNS.find(c => c.value === col)?.kind || 'text'

const peso = (n: number | null | undefined) =>
  n == null ? '' : `₱${Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`

const card: React.CSSProperties = { background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 24, marginBottom: 20 }
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#3a4339', marginBottom: 6 }
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #d9e0d7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fbfcfa', color: '#151a17', outline: 'none', boxSizing: 'border-box' }
const sectionTitle: React.CSSProperties = { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#151a17' }

export default function CollectionEditor({ initial }: { initial: CollectionData }) {
  const router = useRouter()
  const isEdit = !!initial.id

  const [data, setData] = useState<CollectionData>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Manual member list (only meaningful for manual collections)
  const [members, setMembers] = useState<ProductLite[]>(initial.products?.filter(p => p.source !== 'smart') || [])

  // Smart preview
  const [preview, setPreview] = useState<{ total: number; products: ProductLite[] }>({ total: 0, products: [] })
  const [previewing, setPreviewing] = useState(false)

  // Product search (manual add)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<ProductLite[]>([])
  const searchTimer = useRef<any>(null)

  const update = <K extends keyof CollectionData>(k: K, v: CollectionData[K]) =>
    setData(d => ({ ...d, [k]: v }))

  // ── Smart preview (debounced) ─────────────────────────────────────
  const runPreview = useCallback(async (rules: CollectionRule[], match: 'all' | 'any') => {
    const valid = rules.filter(r => r.column && r.relation && r.condition.trim())
    if (valid.length === 0) { setPreview({ total: 0, products: [] }); return }
    setPreviewing(true)
    try {
      const res = await fetch('/api/collections/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: valid, rulesMatch: match, limit: 24 }),
      })
      const json = await res.json()
      setPreview({ total: json.total || 0, products: json.products || [] })
    } catch { setPreview({ total: 0, products: [] }) }
    finally { setPreviewing(false) }
  }, [])

  useEffect(() => {
    if (data.type !== 'smart') return
    const t = setTimeout(() => runPreview(data.rules, data.rulesMatch), 400)
    return () => clearTimeout(t)
  }, [data.type, data.rules, data.rulesMatch, runPreview])

  // ── Product search ────────────────────────────────────────────────
  useEffect(() => {
    if (data.type !== 'manual') return
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!searchQ.trim()) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQ)}&limit=10`)
        const json = await res.json()
        const docs = (json.docs || []).map((p: any) => ({
          id: p.id, title: p.title, slug: p.slug, price: p.price,
          imageUrl: p.imageUrl || p.images?.[0]?.url || null,
        }))
        setSearchResults(docs)
      } catch { setSearchResults([]) }
    }, 300)
  }, [searchQ, data.type])

  // ── Rules ─────────────────────────────────────────────────────────
  const addRule = () => update('rules', [...data.rules, { column: 'TAG', relation: 'EQUALS', condition: '' }])
  const setRule = (i: number, patch: Partial<CollectionRule>) =>
    update('rules', data.rules.map((r, n) => n === i ? { ...r, ...patch } : r))
  const removeRule = (i: number) => update('rules', data.rules.filter((_, n) => n !== i))

  // ── Manual members ────────────────────────────────────────────────
  async function addMember(p: ProductLite) {
    if (members.some(m => m.id === p.id)) return
    setMembers(prev => [...prev, p])
    setSearchQ(''); setSearchResults([])
    if (isEdit) {
      await fetch(`/api/collections/${initial.id}/products`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id }),
      })
    }
  }
  async function removeMember(id: number) {
    setMembers(prev => prev.filter(m => m.id !== id))
    if (isEdit) {
      await fetch(`/api/collections/${initial.id}/products`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id }),
      })
    }
  }

  // ── Save ──────────────────────────────────────────────────────────
  async function save() {
    if (!data.title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        title: data.title, slug: data.slug, description: data.description,
        imageUrl: data.imageUrl, type: data.type, rules: data.rules,
        rulesMatch: data.rulesMatch, published: data.published, featured: data.featured,
        position: data.position, productSort: data.productSort,
        seoTitle: data.seoTitle, seoDescription: data.seoDescription,
      }
      if (isEdit) {
        const res = await fetch(`/api/collections/${initial.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
        router.refresh()
      } else {
        const res = await fetch('/api/collections', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Create failed')
        const { id } = await res.json()
        // For a new manual collection, persist the picked members
        if (data.type === 'manual' && members.length) {
          for (const m of members) {
            await fetch(`/api/collections/${id}/products`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: m.id }),
            })
          }
        }
        router.push(`/admin/collections/${id}`)
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally { setSaving(false) }
  }

  async function del() {
    if (!isEdit || !confirm('Delete this collection? Membership links are removed (products are kept).')) return
    await fetch(`/api/collections/${initial.id}`, { method: 'DELETE' })
    router.push('/admin/collections')
  }

  const displayProducts = data.type === 'smart' ? preview.products : members
  const displayTotal = data.type === 'smart' ? preview.total : members.length

  return (
    <main style={{ maxWidth: 1100, margin: '32px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <a href="/admin/collections" style={{ color: '#667168', fontSize: 13, textDecoration: 'none' }}>← Collections</a>
          <h1 style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 700, color: '#151a17' }}>
            {isEdit ? data.title : 'New collection'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isEdit && <button onClick={del} style={{ padding: '10px 18px', background: '#fff', color: '#b0392f', border: '1.5px solid #e8c5c1', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete</button>}
          <button onClick={save} disabled={saving} style={{ padding: '10px 28px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#fdecea', border: '1px solid #f3c5bf', color: '#b0392f', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* ── Left column ── */}
        <div>
          {/* Basics */}
          <div style={card}>
            <label style={label}>Title</label>
            <input style={input} value={data.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Lighting" />
            <div style={{ height: 16 }} />
            <label style={label}>Description</label>
            <textarea style={{ ...input, minHeight: 90, resize: 'vertical' }} value={data.description} onChange={e => update('description', e.target.value)} placeholder="Shown on the collection page…" />
          </div>

          {/* Type */}
          <div style={card}>
            <h3 style={sectionTitle}>Products</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              {(['manual', 'smart'] as const).map(t => (
                <button key={t} onClick={() => update('type', t)} style={{
                  flex: 1, padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                  border: data.type === t ? '2px solid #1e7a47' : '1.5px solid #d9e0d7',
                  borderRadius: 10, background: data.type === t ? '#f0f7f2' : '#fff',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#151a17' }}>{t === 'smart' ? '⚡ Smart' : '✋ Manual'}</div>
                  <div style={{ fontSize: 12, color: '#667168', marginTop: 2 }}>
                    {t === 'smart' ? 'Auto-include products matching conditions' : 'Hand-pick each product'}
                  </div>
                </button>
              ))}
            </div>

            {data.type === 'smart' ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: '#3a4339' }}>
                  Products must match
                  <select value={data.rulesMatch} onChange={e => update('rulesMatch', e.target.value as 'all' | 'any')} style={{ ...input, width: 'auto', padding: '6px 10px' }}>
                    <option value="all">all conditions</option>
                    <option value="any">any condition</option>
                  </select>
                </div>
                {data.rules.map((rule, i) => {
                  const kind = kindOf(rule.column)
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <select value={rule.column} onChange={e => setRule(i, { column: e.target.value as RuleColumn })} style={{ ...input, flex: '0 0 140px' }}>
                        {RULE_COLUMNS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      <select value={rule.relation} onChange={e => setRule(i, { relation: e.target.value as any })} style={{ ...input, flex: '0 0 150px' }}>
                        {RELATIONS_BY_KIND[kind].map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <input style={{ ...input, flex: 1 }} value={rule.condition} onChange={e => setRule(i, { condition: e.target.value })} placeholder={kind === 'tag' ? 'tag value' : kind === 'number' ? '0' : 'value'} />
                      <button onClick={() => removeRule(i)} style={{ flex: '0 0 auto', padding: '8px 10px', background: '#fff', border: '1.5px solid #e8c5c1', color: '#b0392f', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✕</button>
                    </div>
                  )
                })}
                <button onClick={addRule} style={{ marginTop: 8, padding: '8px 16px', background: '#f0f7f2', border: '1.5px dashed #9cc4a9', color: '#1e7a47', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add condition</button>
              </div>
            ) : (
              <div>
                <label style={label}>Add products</label>
                <div style={{ position: 'relative' }}>
                  <input style={input} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search products by name…" />
                  {searchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #d9e0d7', borderRadius: 8, marginTop: 4, maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                      {searchResults.map(p => (
                        <button key={p.id} onClick={() => addMember(p)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid #f0f0f0', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: '#eef1ed', backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: '#151a17' }}>{p.title}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#667168' }}>{peso(p.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Matched / member products */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <h3 style={{ ...sectionTitle, margin: 0 }}>{data.type === 'smart' ? 'Matched products' : 'Products in this collection'}</h3>
              <span style={{ fontSize: 13, color: '#667168' }}>
                {previewing ? 'evaluating…' : `${displayTotal} product${displayTotal === 1 ? '' : 's'}`}
              </span>
            </div>
            {displayProducts.length === 0 ? (
              <p style={{ color: '#9aa69c', fontSize: 14, margin: 0 }}>
                {data.type === 'smart' ? 'Add conditions above to see matching products.' : 'Search above to add products.'}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {displayProducts.map(p => (
                  <div key={p.id} style={{ border: '1px solid #eef1ed', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: '100%', aspectRatio: '1', background: '#eef1ed', backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: 12, color: '#151a17', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: '#667168', marginTop: 2 }}>{peso(p.price)}</div>
                    </div>
                    {data.type === 'manual' && (
                      <button onClick={() => removeMember(p.id)} title="Remove" style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 999, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column (sidebar) ── */}
        <div>
          <div style={card}>
            <h3 style={sectionTitle}>Visibility</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 12 }}>
              <input type="checkbox" checked={data.published} onChange={e => update('published', e.target.checked)} />
              Published (visible on storefront)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={data.featured} onChange={e => update('featured', e.target.checked)} />
              ★ Feature on homepage
            </label>
          </div>

          <div style={card}>
            <h3 style={sectionTitle}>Display</h3>
            <label style={label}>Sort products by</label>
            <select style={input} value={data.productSort} onChange={e => update('productSort', e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div style={{ height: 14 }} />
            <label style={label}>Homepage order (lower = first)</label>
            <input style={input} type="number" value={data.position} onChange={e => update('position', parseInt(e.target.value, 10) || 0)} />
          </div>

          <div style={card}>
            <h3 style={sectionTitle}>Image</h3>
            <ImagePickerField value={data.imageUrl || ''} onChange={v => update('imageUrl', v)} aspectRatio="4 / 3" />
          </div>

          <div style={card}>
            <h3 style={sectionTitle}>SEO</h3>
            <label style={label}>Page title</label>
            <input style={input} value={data.seoTitle} onChange={e => update('seoTitle', e.target.value)} />
            <div style={{ height: 14 }} />
            <label style={label}>Meta description</label>
            <textarea style={{ ...input, minHeight: 70, resize: 'vertical' }} value={data.seoDescription} onChange={e => update('seoDescription', e.target.value)} />
          </div>
        </div>
      </div>
    </main>
  )
}
