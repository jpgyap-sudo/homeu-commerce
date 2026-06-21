/**
 * Admin Category Edit Page
 *
 * Client component for editing an existing category.
 * Loads category data by ID and saves via PATCH /api/categories/[id].
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ImagePickerField } from '@/components/admin/ImagePickerField'

// ── Types ────────────────────────────────────────────────────────────

interface CategoryData {
  id: number
  title: string
  slug: string
  description: string | null
  imageUrl: string | null
  parentId: number | null
  productCount: number
  products: Array<{ id: number; title: string; slug: string }>
  createdAt: string
  updatedAt: string
}

interface CategoryOption {
  id: number
  title: string
}

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

export default function EditCategoryPage() {
  const params = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Parent category options
  const [parentOptions, setParentOptions] = useState<CategoryOption[]>([])

  // Form fields
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [parentId, setParentId] = useState('')
  const [productCount, setProductCount] = useState(0)
  const [linkedProducts, setLinkedProducts] = useState<Array<{ id: number; title: string; slug: string }>>([])

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const id = params?.id as string
        if (!id) throw new Error('Category ID not found')

        // Load all categories for parent dropdown (excluding self)
        const catRes = await fetch('/api/categories')
        if (catRes.ok) {
          const catData = await catRes.json()
          const allCats: CategoryOption[] = (catData.docs || catData || [])
            .map((c: any) => ({ id: c.id, title: c.title }))
            .filter((c: any) => String(c.id) !== id)
          setParentOptions(allCats)
        }

        // Load category detail
        const res = await fetch(`/api/categories/${id}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load category')

        const data: CategoryData = await res.json()
        populateForm(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load category')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params?.id])

  function populateForm(data: CategoryData) {
    setTitle(data.title || '')
    setSlug(data.slug || '')
    setDescription(data.description || '')
    setImageUrl(data.imageUrl || '')
    setParentId(data.parentId != null ? String(data.parentId) : '')
    setProductCount(data.productCount || 0)
    setLinkedProducts(data.products || [])
  }

  // ── Auto-generate slug from title ─────────────────────────────
  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value))
    }
  }

  // ── Save ──────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const id = params?.id as string
      if (!id) throw new Error('Category ID not found')

      const payload: Record<string, any> = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        parent_id: parentId ? parseInt(parentId) : null,
      }

      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update category')
      }

      setSuccess('Category updated successfully!')
      setTimeout(() => router.refresh(), 500)
    } catch (err: any) {
      setError(err.message || 'Failed to update category')
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
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete category')
      router.push('/admin/categories')
    } catch (err: any) {
      setError(err.message || 'Failed to delete')
      setDeleting(false)
    }
  }

  // ── Render states ─────────────────────────────────────────────
  if (loading) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#667168' }}>Loading category...</p>
      </main>
    )
  }

  if (error && !title) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#fee', color: '#b42318', padding: '16px', borderRadius: 6 }}>{error}</div>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/admin/categories" style={{ color: '#667168' }}>&larr; Back to Categories</Link>
        </p>
      </main>
    )
  }

  // ── Render form ───────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/categories" style={{ color: '#667168' }}>Categories</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 600 }}>{title}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#151a17' }}>Edit Category</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>
            ID: {params?.id} · {productCount} linked product{productCount !== 1 ? 's' : ''}
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
          {deleting ? 'Deleting...' : '🗑 Delete Category'}
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
              <input
                type="text"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                required
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
            <Field label="Parent Category">
              <select value={parentId} onChange={e => setParentId(e.target.value)} style={selectStyle}>
                <option value="">— No Parent —</option>
                {parentOptions.map(cat => (
                  <option key={cat.id} value={String(cat.id)}>{cat.title}</option>
                ))}
              </select>
            </Field>
            <ImagePickerField label="Collection Image" value={imageUrl} onChange={setImageUrl} aspectRatio="16 / 9" />
          </div>
        </Section>

        {/* ── Section: Description ── */}
        <Section title="Description">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="Category description..."
          />
        </Section>

        {/* ── Section: Linked Products ── */}
        {linkedProducts.length > 0 && (
          <Section title={`Linked Products (${linkedProducts.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {linkedProducts.map(p => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}`}
                  style={{
                    color: '#1a6d3e',
                    textDecoration: 'none',
                    fontSize: 14,
                    padding: '8px 12px',
                    background: '#fff',
                    border: '1px solid #eef1ed',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{p.title}</span>
                  <span style={{ color: '#667168', fontSize: 12 }}>({p.slug})</span>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, paddingBottom: 40 }}>
          <Link
            href="/admin/categories"
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
