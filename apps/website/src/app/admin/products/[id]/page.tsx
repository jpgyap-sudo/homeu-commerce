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
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { ProductImagesManager } from '@/components/admin/ProductImagesManager'

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

interface ProductVariant {
  id: number
  title: string
  sku?: string | null
  price: number
  salePrice?: number | null
  inventoryQuantity?: number | null
  isDefault?: boolean
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
  const [variants, setVariants] = useState<ProductVariant[]>([])

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
        setVariants(product.variants || [])
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
        description: description.trim() || null,
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

        {/* ── Section: Variants ── */}
        <Section title="Models / Variants">
          <p style={{ fontSize: 13, color: '#667168', margin: '-4px 0 14px' }}>
            For products sold as several selectable models (e.g. Armchair / Two-seater / Three-seater),
            each with its own price. When variants exist, the storefront shows a model dropdown instead
            of the single Price field above.
          </p>
          <VariantsEditor
            productId={parseInt(params?.id as string, 10)}
            variants={variants}
            onChange={setVariants}
          />
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

        {/* ── Section: Images ── */}
        <Section title="Images">
          <ProductImagesManager productId={parseInt(params?.id as string, 10)} />
        </Section>

        {/* ── Section: Description ── */}
        <Section title="Description">
          <RichTextEditor value={description} onChange={setDescription} minHeight={180} />
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

const cellInputStyle: React.CSSProperties = { ...inputStyle, padding: '8px 10px', fontSize: 13 }

/** CRUD editor for a product's models/variants — each row saves itself
 * immediately via the admin variants API, no separate "Save" step needed
 * since these are a different table from the parent product form. */
function VariantsEditor({ productId, variants, onChange }: {
  productId: number
  variants: ProductVariant[]
  onChange: (variants: ProductVariant[]) => void
}) {
  const [busyId, setBusyId] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState({ title: '', sku: '', price: '', salePrice: '', inventoryQuantity: '' })
  const [rowError, setRowError] = useState('')

  async function addVariant() {
    if (!draft.title.trim() || !draft.price) { setRowError('Title and price are required'); return }
    setRowError('')
    setBusyId('new')
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: draft.title, sku: draft.sku || null, price: draft.price,
          salePrice: draft.salePrice || null, inventoryQuantity: draft.inventoryQuantity || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add variant')
      onChange([...variants, data.variant ? {
        id: data.variant.id, title: data.variant.title, sku: data.variant.sku,
        price: parseFloat(data.variant.price), salePrice: data.variant.sale_price ? parseFloat(data.variant.sale_price) : null,
        inventoryQuantity: data.variant.inventory_quantity, isDefault: data.variant.is_default,
      } : draft as any])
      setDraft({ title: '', sku: '', price: '', salePrice: '', inventoryQuantity: '' })
    } catch (err: any) {
      setRowError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function updateVariant(id: number, patch: Partial<ProductVariant>) {
    setBusyId(id)
    try {
      const body: any = {}
      if (patch.title !== undefined) body.title = patch.title
      if (patch.sku !== undefined) body.sku = patch.sku
      if (patch.price !== undefined) body.price = patch.price
      if (patch.salePrice !== undefined) body.salePrice = patch.salePrice
      if (patch.inventoryQuantity !== undefined) body.inventoryQuantity = patch.inventoryQuantity
      const res = await fetch(`/api/admin/products/${productId}/variants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to update variant') }
      onChange(variants.map(v => v.id === id ? { ...v, ...patch } : v))
    } catch (err: any) {
      setRowError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function deleteVariant(id: number) {
    if (!confirm('Delete this model? This cannot be undone.')) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to delete variant') }
      onChange(variants.filter(v => v.id !== id))
    } catch (err: any) {
      setRowError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {variants.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#667168' }}>
                <th style={{ padding: '4px 8px' }}>Model / Option</th>
                <th style={{ padding: '4px 8px' }}>SKU</th>
                <th style={{ padding: '4px 8px' }}>Price</th>
                <th style={{ padding: '4px 8px' }}>Sale Price</th>
                <th style={{ padding: '4px 8px' }}>Stock</th>
                <th style={{ padding: '4px 8px' }} />
              </tr>
            </thead>
            <tbody>
              {variants.map(v => (
                <tr key={v.id} style={{ borderTop: '1px solid #eef1ed' }}>
                  <td style={{ padding: '4px 8px' }}>
                    <input defaultValue={v.title} style={cellInputStyle}
                      onBlur={e => e.target.value !== v.title && updateVariant(v.id, { title: e.target.value })} />
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    <input defaultValue={v.sku || ''} style={cellInputStyle}
                      onBlur={e => e.target.value !== (v.sku || '') && updateVariant(v.id, { sku: e.target.value })} />
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    <input type="number" min={0} step={0.01} defaultValue={v.price} style={{ ...cellInputStyle, maxWidth: 120 }}
                      onBlur={e => parseFloat(e.target.value) !== v.price && updateVariant(v.id, { price: parseFloat(e.target.value) })} />
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    <input type="number" min={0} step={0.01} defaultValue={v.salePrice ?? ''} style={{ ...cellInputStyle, maxWidth: 120 }}
                      placeholder="—"
                      onBlur={e => updateVariant(v.id, { salePrice: e.target.value ? parseFloat(e.target.value) : null })} />
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    <input type="number" defaultValue={v.inventoryQuantity ?? 0} style={{ ...cellInputStyle, maxWidth: 90 }}
                      onBlur={e => parseInt(e.target.value, 10) !== v.inventoryQuantity && updateVariant(v.id, { inventoryQuantity: parseInt(e.target.value, 10) })} />
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    <button type="button" onClick={() => deleteVariant(v.id)} disabled={busyId === v.id}
                      style={{ background: 'none', border: 'none', color: '#b42318', cursor: 'pointer', fontSize: 16 }}
                      title="Delete this model">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
        <Field label="Model / Option">
          <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}
            placeholder="e.g. Two-seater 1650x900x820mm" style={cellInputStyle} />
        </Field>
        <Field label="SKU">
          <input value={draft.sku} onChange={e => setDraft({ ...draft, sku: e.target.value })} style={cellInputStyle} />
        </Field>
        <Field label="Price">
          <input type="number" min={0} step={0.01} value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} style={cellInputStyle} />
        </Field>
        <Field label="Sale Price">
          <input type="number" min={0} step={0.01} value={draft.salePrice} onChange={e => setDraft({ ...draft, salePrice: e.target.value })} style={cellInputStyle} />
        </Field>
        <Field label="Stock">
          <input type="number" value={draft.inventoryQuantity} onChange={e => setDraft({ ...draft, inventoryQuantity: e.target.value })} style={cellInputStyle} />
        </Field>
        <button type="button" onClick={addVariant} disabled={busyId === 'new'}
          style={{
            padding: '8px 16px', background: '#1a6d3e', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: busyId === 'new' ? 'not-allowed' : 'pointer',
            height: 38,
          }}>
          {busyId === 'new' ? 'Adding…' : '+ Add Model'}
        </button>
      </div>
      {rowError && <p style={{ color: '#b42318', fontSize: 12, marginTop: 8 }}>{rowError}</p>}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}
