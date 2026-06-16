/**
 * Admin Media Edit Page
 *
 * Client component for editing an existing media entry.
 * Shows image preview, metadata, and editable fields.
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────

interface MediaData {
  id: number
  filename: string | null
  alt: string | null
  mime_type: string | null
  filesize: number | null
  width: number | null
  height: number | null
  url: string | null
  created_at: string
  updated_at: string
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Component ────────────────────────────────────────────────────────

export default function EditMediaPage() {
  const params = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form fields
  const [filename, setFilename] = useState('')
  const [alt, setAlt] = useState('')
  const [url, setUrl] = useState('')
  const [mimeType, setMimeType] = useState('')
  const [filesize, setFilesize] = useState<number | null>(null)
  const [width, setWidth] = useState<number | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [createdAt, setCreatedAt] = useState('')
  const [originalMedia, setOriginalMedia] = useState<MediaData | null>(null)

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const id = params?.id as string
        if (!id) throw new Error('Media ID not found')

        const res = await fetch(`/api/media/${id}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load media')

        const data: MediaData = await res.json()
        setOriginalMedia(data)
        populateForm(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load media')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params?.id])

  function populateForm(data: MediaData) {
    setFilename(data.filename || '')
    setAlt(data.alt || '')
    setUrl(data.url || '')
    setMimeType(data.mime_type || '')
    setFilesize(data.filesize)
    setWidth(data.width)
    setHeight(data.height)
    setCreatedAt(data.created_at)
  }

  // ── Save ──────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const id = params?.id as string
      if (!id) throw new Error('Media ID not found')

      const payload: Record<string, any> = {
        filename: filename.trim() || null,
        alt: alt.trim() || null,
        url: url.trim() || null,
      }

      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update media')
      }

      setSuccess('Media updated successfully!')
      setTimeout(() => router.refresh(), 500)
    } catch (err: any) {
      setError(err.message || 'Failed to update media')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete this media? This action cannot be undone.`)) return
    setDeleting(true)
    setError('')

    try {
      const id = params?.id as string
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete media')
      router.push('/admin/media')
    } catch (err: any) {
      setError(err.message || 'Failed to delete')
      setDeleting(false)
    }
  }

  // ── Render states ─────────────────────────────────────────────
  if (loading) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#667168' }}>Loading media...</p>
      </main>
    )
  }

  if (error && !originalMedia) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#fee', color: '#b42318', padding: '16px', borderRadius: 6 }}>{error}</div>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/admin/media" style={{ color: '#667168' }}>&larr; Back to Media</Link>
        </p>
      </main>
    )
  }

  // ── Render form ───────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/media" style={{ color: '#667168' }}>Media</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 600 }}>{filename || 'Media #' + params?.id}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#151a17' }}>Edit Media</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>
            ID: {params?.id} · Created: {createdAt ? new Date(createdAt).toLocaleDateString('en-PH') : '—'}
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
          {deleting ? 'Deleting...' : '🗑 Delete Media'}
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
        {/* ── Section: Preview ── */}
        <Section title="Preview">
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#f7f9f6',
            borderRadius: 8,
            minHeight: 200,
            maxHeight: 400,
            overflow: 'hidden',
          }}>
            {url ? (
              <img
                src={url}
                alt={alt || filename || 'Media preview'}
                style={{
                  maxWidth: '100%',
                  maxHeight: 400,
                  objectFit: 'contain',
                  borderRadius: 4,
                }}
              />
            ) : (
              <span style={{ fontSize: 48, color: '#ccc' }}>🖼</span>
            )}
          </div>
        </Section>

        {/* ── Section: Edit Fields ── */}
        <Section title="Media Details">
          <div style={{ display: 'grid', gap: 16 }}>
            <Field label="URL">
              <input type="url" value={url} onChange={e => setUrl(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Filename">
              <input type="text" value={filename} onChange={e => setFilename(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Alt Text">
              <input type="text" value={alt} onChange={e => setAlt(e.target.value)} style={inputStyle} placeholder="Descriptive alt text for accessibility" />
            </Field>
          </div>
        </Section>

        {/* ── Section: Metadata ── */}
        <Section title="Metadata">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <MetadataField label="MIME Type" value={mimeType || '—'} />
            <MetadataField label="File Size" value={formatFileSize(filesize)} />
            <MetadataField label="Width" value={width != null ? `${width}px` : '—'} />
            <MetadataField label="Height" value={height != null ? `${height}px` : '—'} />
            <MetadataField label="Created" value={createdAt ? new Date(createdAt).toLocaleDateString('en-PH') : '—'} />
          </div>
        </Section>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, paddingBottom: 40 }}>
          <Link
            href="/admin/media"
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
            &larr; Back to Library
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

function MetadataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#151a17' }}>{value}</div>
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
