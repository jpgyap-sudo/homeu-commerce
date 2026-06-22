'use client'

import { useState, useEffect, useRef } from 'react'

interface Attachment {
  id: number
  url: string
  filename: string
  mimeType: string
  sizeBytes: number
  uploadedBy: 'customer' | 'admin'
  createdAt: string
  expiresAt: string
}

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.xls,.xlsx,.doc,.docx'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

export default function RfqAttachments({ rfqId, canDelete }: { rfqId: string; canDelete?: boolean }) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function load() {
    fetch(`/api/rfq/${rfqId}/attachments`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { attachments: [] })
      .then(d => setAttachments(d.attachments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [rfqId])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError('')
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`/api/rfq/${rfqId}/attachments`, {
          method: 'POST', credentials: 'include', body: formData,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || `Failed to upload ${file.name}`)
        }
      }
      load()
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this file?')) return
    const res = await fetch(`/api/rfq/${rfqId}/attachments/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) setAttachments(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="rfq-attachments">
      <h2 className="rfq-attachments__title">📎 Project Files</h2>
      <p className="rfq-attachments__hint">
        Upload reference images, floor plans, or photos of your space — anything that helps us
        understand your project. Accepted: PDF, images, Excel, or Word files (15MB max each).
        Files are automatically removed after 30 days.
      </p>

      {error && <div className="rfq-attachments__error">{error}</div>}

      {!loading && attachments.length > 0 && (
        <ul className="rfq-attachments__list">
          {attachments.map(a => (
            <li key={a.id} className="rfq-attachments__item">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="rfq-attachments__link">
                📄 {a.filename}
              </a>
              <span className="rfq-attachments__meta">
                {formatBytes(a.sizeBytes)} · {a.uploadedBy === 'admin' ? 'HomeU Team' : 'You'} · expires in {daysUntil(a.expiresAt)}d
              </span>
              {canDelete !== false && (
                <button type="button" onClick={() => handleDelete(a.id)} className="rfq-attachments__remove" aria-label="Remove file">✕</button>
              )}
            </li>
          ))}
        </ul>
      )}

      <label className="rfq-attachments__upload-btn">
        {uploading ? 'Uploading…' : '+ Upload File'}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          disabled={uploading}
          onChange={e => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  )
}
