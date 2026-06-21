/**
 * Admin Product Create Page
 *
 * Client component for creating a new product.
 * Auto-generates slug from title, saves via POST /api/products,
 * and redirects to the edit page on success.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RichTextEditor } from '@/components/admin/RichTextEditor'

// ── Types ────────────────────────────────────────────────────────────

interface Category {
  id: number
  title: string
  slug: string
}

// ── Options ──────────────────────────────────────────────────────────

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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Component ────────────────────────────────────────────────────────

export default function NewProductPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Categories
  const [categories, setCategories] = useState<Category[]>([])

  // ── Form fields ────────────────────────────────────────────────
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
  const [categoryId, setCategoryId] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')

  // ── Load categories on mount ───────────────────────────────────
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories')
        if (res.ok) {
          const data = await res.json()
          setCategories(data.docs || data || [])
        }
      } catch {
        // categories are optional
      }
    }
    loadCategories()
  }, [])

  // ── Auto-generate slug from title ──────────────────────────────
  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value))
    }
  }

  // ── Save ───────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      if (!title.trim()) {
        throw new Error('Product title is required.')
      }

      const body = {
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
        category_id: categoryId ? parseInt(categoryId) : null,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create product')
      }

      const result = await res.json()
      const productId = result.product?.id

      if (productId) {
        setSuccess(`Product "${result.product?.title}" created!`)
        setTimeout(() => {
          router.push(`/admin/products/${productId}`)
          router.refresh()
        }, 800)
      } else {
        // Fallback: go to list
        setTimeout(() => {
          router.push('/admin/products')
          router.refresh()
        }, 800)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/products" style={{ color: '#667168' }}>Products</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 600 }}>New Product</span>
      </div>

      <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#151a17' }}>Create New Product</h1>
      <p style={{ color: '#667168', marginBottom: 32, fontSize: 14 }}>
        Fill in the product details below. Required fields are marked with an asterisk (*).
      </p>

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
              <input
                type="text"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                required
                placeholder="e.g. Modern Dining Chair"
                style={inputStyle}
              />
            </Field>
            <Field label="Slug">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={generateSlug(title) || 'auto-generated'}
                />
                <button
                  type="button"
                  onClick={() => setSlug(generateSlug(title))}
                  style={{
                    padding: '8px 12px', background: '#f5f5f5', border: '1.5px solid #d9e0d7',
                    borderRadius: 8, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Auto
                </button>
              </div>
            </Field>
            <Field label="SKU">
              <input type="text" value={sku} onChange={e => setSku(e.target.value)} style={inputStyle} placeholder="e.g. CHR-001" />
            </Field>
            <Field label="Status">
              <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Vendor">
              <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Product Type">
              <input type="text" value={productType} onChange={e => setProductType(e.target.value)} style={inputStyle} placeholder="e.g. Dining Chair" />
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
            <Field label="Regular Price">
              <input type="number" min={0} step={0.01} value={price} onChange={e => setPrice(e.target.value)} style={inputStyle} placeholder="0.00" />
            </Field>
            <Field label="Sale Price">
              <input type="number" min={0} step={0.01} value={salePrice} onChange={e => setSalePrice(e.target.value)} style={inputStyle} placeholder="0.00" />
            </Field>
            <Field label="Price Note">
              <input type="text" value={priceNote} onChange={e => setPriceNote(e.target.value)} style={inputStyle} placeholder="e.g. Price may vary" />
            </Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            Show price on storefront
          </label>
        </Section>

        {/* ── Section: Inventory ── */}
        <Section title="Inventory">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={inventoryTracked} onChange={e => setInventoryTracked(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            Track inventory quantity
          </label>
          {inventoryTracked && (
            <Field label="Quantity in Stock">
              <input type="number" min={0} value={inventoryQuantity} onChange={e => setInventoryQuantity(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }} />
            </Field>
          )}
        </Section>

        {/* ── Section: Description ── */}
        <Section title="Description">
          <RichTextEditor value={description} onChange={setDescription} minHeight={180} />
        </Section>

        {/* ── Section: Details ── */}
        <Section title="Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Dimensions">
              <input type="text" value={dimensions} onChange={e => setDimensions(e.target.value)} style={inputStyle} placeholder="e.g. 48″ × 24″ × 30″" />
            </Field>
            <Field label="Materials">
              <input type="text" value={materials} onChange={e => setMaterials(e.target.value)} style={inputStyle} placeholder="e.g. Solid Wood, Fabric" />
            </Field>
          </div>
        </Section>

        {/* ── Section: SEO ── */}
        <Section title="SEO">
          <div style={{ display: 'grid', gap: 16 }}>
            <Field label="SEO Title">
              <input type="text" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} style={inputStyle} placeholder="Search result title (leave empty to auto-generate)" />
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
            Cancel
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
            {saving ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </main>
  )
}

// ── Sub-components ───────────────────────────────────────────────────

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
