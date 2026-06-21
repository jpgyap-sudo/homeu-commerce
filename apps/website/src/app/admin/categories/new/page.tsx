/**
 * Admin Category Create Page
 *
 * Client component for creating a new category.
 * Auto-generates slug from title, saves via POST /api/categories,
 * and redirects to the edit page on success.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ImagePickerField } from '@/components/admin/ImagePickerField'

// ── Types ────────────────────────────────────────────────────────────

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

export default function NewCategoryPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
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

  // ── Load parent categories on mount ────────────────────────────
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories')
        if (res.ok) {
          const data = await res.json()
          const cats: CategoryOption[] = (data.docs || data || []).map((c: any) => ({
            id: c.id,
            title: c.title,
          }))
          setParentOptions(cats)
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
        throw new Error('Category title is required.')
      }

      const body = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        parent_id: parentId ? parseInt(parentId) : null,
      }

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create category')
      }

      const result = await res.json()
      const categoryId = result.category?.id

      if (categoryId) {
        setSuccess(`Category "${result.category?.title}" created!`)
        setTimeout(() => {
          router.push(`/admin/categories/${categoryId}`)
          router.refresh()
        }, 800)
      } else {
        setTimeout(() => {
          router.push('/admin/categories')
          router.refresh()
        }, 800)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create category')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/categories" style={{ color: '#667168' }}>Categories</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 600 }}>New Category</span>
      </div>

      <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#151a17' }}>Create New Category</h1>
      <p style={{ color: '#667168', marginBottom: 32, fontSize: 14 }}>
        Fill in the category details below. Required fields are marked with an asterisk (*).
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
                placeholder="e.g. Living Room Furniture"
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
            {saving ? 'Creating...' : 'Create Category'}
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
