/**
 * Admin Product Edit Page
 *
 * Client component for editing an existing product.
 * Loads product data by ID, renders a full form, and saves via `@/lib/db` helpers.
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────

interface Category {
  id: number
  title: string
  slug: string
}

interface ProductData {
  id: number
  title: string
  slug: string
  sku: string | null
  price: number | null
  sale_price: number | null
  show_price: boolean | null
  price_note: string | null
  status: string | null
  vendor: string | null
  product_type: string | null
  description: any | null
  dimensions: string | null
  materials: string | null
  category_id: number | null
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
}

// ── Status / Sales Channel options ───────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'draft', label: '⚪ Draft' },
  { value: 'active', label: '🟢 Active' },
  { value: 'archived', label: '🔴 Archived' },
]

const SALES_CHANNEL_OPTIONS = [
  { value: 'online-store', label: 'Online Store' },
  { value: 'rfq-catalog', label: 'RFQ Catalog' },
  { value: 'admin-draft', label: 'Admin Draft' },
]

// ── Helpers ──────────────────────────────────────────────────────────

function formatPrice(val: number | null): string {
  if (val == null) return '—'
  return `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function jsonDescriptionToString(desc: any): string {
  if (!desc) return ''
  // Handle lexical JSON format: extract root.children[0].children[0].text
  try {
    if (typeof desc === 'object' && desc.root?.children) {
      return desc.root.children
        .map((block: any) =>
          block.children?.map((c: any) => c.text || '').join('') || ''
        )
        .join('\n')
    }
    if (typeof desc === 'string') {
      return desc
    }
  } catch {
    // fall through
  }
  return ''
}

function stringToJsonDescription(text: string): any {
  if (!text.trim()) return null
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text, detail: 0, format: 0, mode: 'normal', style: '', version: 1 }],
          direction: 'ltr', format: '', indent: 0, version: 1,
        },
      ],
      direction: 'ltr', format: '', indent: 0, version: 1,
    },
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Component ────────────────────────────────────────────────────────

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Categories from DB
  const [categories, setCategories] = useState<Category[]>([])

  // Form fields
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [sku, setSku] = useState('')
  const [status, setStatus] = useState('draft')
  const [vendor, setVendor] = useState('HOMEU.PH')
  const [productType, setProductType] = useState('')
  const [price, setPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [showPrice, setShowPrice] = useState(true)
  const [priceNote, setPriceNote] = useState('')
  const [inventoryTracked, setInventoryTracked] = useState(false)
  const [inventoryQuantity, setInventoryQuantity] = useState('0')
  const [salesChannel, setSalesChannel] = useState('online-store')
  const [description, setDescription] = useState('')
  const [dimensions, setDimensions] = useState('')
  const [materials, setMaterials] = useState('')
  const [tags, setTags] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [originalProduct, setOriginalProduct] = useState<ProductData | null>(null)

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const id = params?.id as string
        if (!id) throw new Error('Product ID not found')

        // Load categories
        const catRes = await fetch('/api/categories')
        if (catRes.ok) {
          const catData = await catRes.json()
          setCategories(catData.docs || catData || [])
        }

        // Load product via API
        const prodRes = await fetch(`/api/products/${id}`, { credentials: 'include' })
        if (!prodRes.ok) throw new Error('Failed to load product')

        const product = await prodRes.json()
        setOriginalProduct(product)
        populateForm(product)
      } catch (err: any) {
        setError(err.message || 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params?.id])

  function populateForm(product: any) {
    setTitle(product.title || '')
    setSlug(product.slug || '')
    setSku(product.sku || '')
    setStatus(product.status || 'draft')
    setVendor(product.vendor || 'HOMEU.PH')
    setProductType(product.productType || '')
    setPrice(product.price != null ? String(product.price) : '')
    setSalePrice(product.salePrice != null ? String(product.salePrice) : '')
    setShowPrice(product.showPrice !== false)
    setPriceNote(product.priceNote || '')
    setInventoryTracked(product.inventoryTracked === true)
    setInventoryQuantity(product.inventoryQuantity != null ? String(product.inventoryQuantity) : '0')
    setSalesChannel(product.salesChannel || 'online-store')
    setDescription(jsonDescriptionToString(product.description))
    setDimensions(product.dimensions || '')
    setMaterials(product.materials || '')
    setTags(Array.isArray(product.tags) ? product.tags.join(', ') : '')
    setCategoryId(product.category_id != null ? String(product.category_id) : '')
    setSeoTitle(product.seoTitle || '')
    setSeoDescription(product.seoDescription || '')
  }

  // ── Save ──────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const id = params?.id as string
      if (!id) throw new Error('Product ID not found')

      const payload: Record<string, any> = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        sku: sku.trim() || null,
        status,
        vendor: vendor.trim() || 'HOMEU.PH',
        product_type: productType.trim() || null,
        price: price ? parseFloat(price) : null,
        sale_price: salePrice ? parseFloat(salePrice) : null,
        show_price: showPrice,
        price_note: priceNote.trim() || null,
        inventory_tracked: inventoryTracked,
        inventory_quantity: parseInt(inventoryQuantity) || 0,
        sales_channel: salesChannel,
        description: stringToJsonDescription(description),
        dimensions: dimensions.trim() || null,
        materials: materials.trim() || null,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        category_id: categoryId ? parseInt(categoryId) : null,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
      }

      // Use the direct SQL update via the API
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update product')
      }

      setSuccess('Product updated successfully!')
      setTimeout(() => router.refresh(), 500)
    } catch (err: any) {
      setError(err.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return
    setDeleting(true)
    setError('')

    try {
      const id = params?.id as string
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete product')
      router.push('/admin/products')
    } catch (err: any) {
      setError(err.message || 'Failed to delete')
      setDeleting(false)
    }
  }

  // ── Render states ─────────────────────────────────────────────
  if (loading) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#667168' }}>Loading product...</p>
      </main>
    )
  }

  if (error && !originalProduct) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#fee', color: '#b42318', padding: '16px', borderRadius: 6 }}>{error}</div>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/admin/products" style={{ color: '#667168' }}>&larr; Back to Products</Link>
        </p>
      </main>
    )
  }

  // ── Render form ───────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/products" style={{ color: '#667168' }}>Products</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 600 }}>{title}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#151a17' }}>Edit Product</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>
            ID: {params?.id} · Created: {originalProduct ? new Date(originalProduct.created_at).toLocaleDateString('en-PH') : '—'}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            padding: '8px 20px',
            background: deleting ? '#999' : '#fff',
            color: '#b42318',
            border: '1.5px solid #fecaca',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: deleting ? 'not-allowed' : 'pointer',
          }}
        >
          {deleting ? 'Deleting...' : '🗑 Delete Product'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b42318', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{error}</div>
      )}
      {success && (
        <div style={{ background: '#e8f5e9', color: '#1a6d3e', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{success}</div>
      )}

      <form onSubmit={handleSave}>
        {/* ── Section: Basic Info ── */}
        <Section title="Basic Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Title *" required>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                style={inputStyle} />
            </Field>
            <Field label="Slug">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" value={slug} onChange={e => setSlug(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={() => setSlug(generateSlug(title))}
                  style={{ padding: '8px 12px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Auto
                </button>
              </div>
            </Field>
            <Field label="SKU">
              <input type="text" value={sku} onChange={e => setSku(e.target.value)}
                style={inputStyle} />
            </Field>
            <Field label="Status">
              <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Vendor">
              <input type="text" value={vendor} onChange={e => setVendor(e.target.value)}
                style={inputStyle} />
            </Field>
            <Field label="Product Type">
              <input type="text" value={productType} onChange={e => setProductType(e.target.value)}
                style={inputStyle} placeholder="e.g. Dining Chair" />
            </Field>
            <Field label="Category">
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={selectStyle}>
                <option value="">— No Category —</option>
                {categories.map(cat => (
                  <option key={cat.id} value={String(cat.id)}>{cat.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Sales Channel">
              <select value={salesChannel} onChange={e => setSalesChannel(e.target.value)} style={selectStyle}>
                {SALES_CHANNEL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* ── Section: Pricing ── */}
        <Section title="Pricing">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Field label="Price">
              <input type="number" min={0} step={0.01} value={price} onChange={e => setPrice(e.target.value)}
                style={inputStyle} />
            </Field>
            <Field label="Sale Price">
              <input type="number" min={0} step={0.01} value={salePrice} onChange={e => setSalePrice(e.target.value)}
                style={inputStyle} />
            </Field>
            <Field label="Price Note">
              <input type="text" value={priceNote} onChange={e => setPriceNote(e.target.value)}
                style={inputStyle} placeholder="e.g. Price may vary" />
            </Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            Show price on storefront
          </label>
        </Section>

        {/* ── Section: Inventory ── */}
        <Section title="Inventory">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={inventoryTracked} onChange={e => setInventoryTracked(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            Track inventory quantity
          </label>
          {inventoryTracked && (
            <Field label="Quantity in Stock">
              <input type="number" min={0} value={inventoryQuantity} onChange={e => setInventoryQuantity(e.target.value)}
                style={{ ...inputStyle, maxWidth: 200 }} />
            </Field>
          )}
        </Section>

        {/* ── Section: Description ── */}
        <Section title="Description">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={6}
            style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="Product description..."
          />
        </Section>

        {/* ── Section: Details ── */}
        <Section title="Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Dimensions">
              <input type="text" value={dimensions} onChange={e => setDimensions(e.target.value)}
                style={inputStyle} placeholder="e.g. 48″ × 24″ × 30″" />
            </Field>
            <Field label="Materials">
              <input type="text" value={materials} onChange={e => setMaterials(e.target.value)}
                style={inputStyle} placeholder="e.g. Solid Wood, Fabric" />
            </Field>
          </div>
          <Field label="Tags">
            <input type="text" value={tags} onChange={e => setTags(e.target.value)}
              style={inputStyle} placeholder="e.g. new, 3DModel, sofa" />
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Comma-separated. <code>new</code> shows a NEW badge, <code>3DModel</code> shows a 3D badge on the storefront.
            </p>
          </Field>
        </Section>

        {/* ── Section: SEO ── */}
        <Section title="SEO">
          <div style={{ display: 'grid', gap: 16 }}>
            <Field label="SEO Title">
              <input type="text" value={seoTitle} onChange={e => setSeoTitle(e.target.value)}
                style={inputStyle} placeholder="Search result title (leave empty to auto-generate)" />
            </Field>
            <Field label="SEO Description">
              <textarea
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Short search result summary..."
              />
            </Field>
          </div>
        </Section>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, paddingBottom: 40 }}>
          <Link
            href="/admin/products"
            style={{
              padding: '10px 24px',
              background: '#f5f5f5',
              color: '#151a17',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 14,
              border: '1px solid #d9e0d7',
            }}
          >
            &larr; Back to List
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 32px',
              background: saving ? '#999' : 'linear-gradient(180deg, #1e7a47, #0f4f2b)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '0 4px 14px rgba(26,109,62,0.35)',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </main>
  )
}

// ── Sub-components ───────────────────────────────────────────────────

/** Styled form section wrapper */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#f9f9f9',
      border: '1px solid #eef1ed',
      borderRadius: 12,
      padding: 24,
      marginBottom: 20,
    }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#151a17' }}>{title}</h2>
      {children}
    </div>
  )
}

/** Form field wrapper */
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#151a17' }}>
        {label}{required && <span style={{ color: '#b42318' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// ── Shared styles ────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #d9e0d7',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
  color: '#151a17',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}
