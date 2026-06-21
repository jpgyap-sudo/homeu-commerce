'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { ImagePickerField } from '@/components/admin/ImagePickerField'

interface BlogOpt { id: number; title: string; handle: string }
export interface ArticleData {
  id?: number
  blogId: number | ''
  title: string
  handle: string
  body: string
  authorName: string
  publishedAt: string  // yyyy-mm-dd
  imageUrl: string
  imageAlt: string
  tags: string[]
  blogHandle?: string
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 24, marginBottom: 20 }
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#3a4339', marginBottom: 6 }
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #d9e0d7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fbfcfa', color: '#151a17', outline: 'none', boxSizing: 'border-box' }

export default function ArticleEditor({ initial, blogs }: { initial: ArticleData; blogs: BlogOpt[] }) {
  const router = useRouter()
  const isEdit = !!initial.id
  const [d, setD] = useState<ArticleData>(initial)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const up = <K extends keyof ArticleData>(k: K, v: ArticleData[K]) => setD(s => ({ ...s, [k]: v }))

  function addTag() {
    const t = tagInput.trim()
    if (t && !d.tags.includes(t)) up('tags', [...d.tags, t])
    setTagInput('')
  }

  async function save() {
    if (!d.title.trim()) { setError('Title is required'); return }
    if (!d.blogId) { setError('Choose a blog'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        blogId: d.blogId, title: d.title, handle: d.handle, body: d.body,
        authorName: d.authorName, publishedAt: d.publishedAt || null,
        imageUrl: d.imageUrl, imageAlt: d.imageAlt, tags: d.tags,
      }
      if (isEdit) {
        const res = await fetch(`/api/admin/articles/${initial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
        router.refresh()
      } else {
        const res = await fetch('/api/admin/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error((await res.json()).error || 'Create failed')
        const { id } = await res.json()
        router.push(`/admin/blogs/${id}`)
      }
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  async function del() {
    if (!isEdit || !confirm('Delete this article?')) return
    await fetch(`/api/admin/articles/${initial.id}`, { method: 'DELETE' })
    router.push('/admin/blogs')
  }

  const viewUrl = isEdit && d.blogHandle ? `/blog/${d.blogHandle}/${d.handle}` : null

  return (
    <main style={{ maxWidth: 1000, margin: '32px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <a href="/admin/blogs" style={{ color: '#667168', fontSize: 13, textDecoration: 'none' }}>← Blogs</a>
          <h1 style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 700, color: '#151a17' }}>{isEdit ? 'Edit article' : 'New article'}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {viewUrl && <a href={viewUrl} target="_blank" rel="noreferrer" style={{ padding: '10px 16px', color: '#1a6d3e', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>View ↗</a>}
          {isEdit && <button onClick={del} style={{ padding: '10px 18px', background: '#fff', color: '#b0392f', border: '1.5px solid #e8c5c1', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete</button>}
          <button onClick={save} disabled={saving} style={{ padding: '10px 28px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}</button>
        </div>
      </div>

      {error && <div style={{ background: '#fdecea', border: '1px solid #f3c5bf', color: '#b0392f', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        <div>
          <div style={card}>
            <label style={label}>Title</label>
            <input style={input} value={d.title} onChange={e => up('title', e.target.value)} />
            <div style={{ height: 16 }} />
            <label style={label}>Body</label>
            <RichTextEditor value={d.body} onChange={v => up('body', v)} />
          </div>
        </div>

        <div>
          <div style={card}>
            <label style={label}>Blog</label>
            <select style={input} value={d.blogId} onChange={e => up('blogId', e.target.value ? parseInt(e.target.value, 10) : '')}>
              <option value="">— choose —</option>
              {blogs.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <div style={{ height: 14 }} />
            <label style={label}>URL handle</label>
            <input style={input} value={d.handle} onChange={e => up('handle', e.target.value)} placeholder="auto from title" />
            <div style={{ height: 14 }} />
            <label style={label}>Author</label>
            <input style={input} value={d.authorName} onChange={e => up('authorName', e.target.value)} />
            <div style={{ height: 14 }} />
            <label style={label}>Published date</label>
            <input style={input} type="date" value={d.publishedAt} onChange={e => up('publishedAt', e.target.value)} />
          </div>

          <div style={card}>
            <ImagePickerField label="Featured image" value={d.imageUrl} onChange={v => up('imageUrl', v)} aspectRatio="16 / 9" />
            <div style={{ height: 10 }} />
            <input style={input} value={d.imageAlt} onChange={e => up('imageAlt', e.target.value)} placeholder="Alt text" />
          </div>

          <div style={card}>
            <label style={label}>Tags</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input style={input} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="Add tag + Enter" />
              <button onClick={addTag} style={{ padding: '0 16px', background: '#151a17', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Add</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {d.tags.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#f0ece4', borderRadius: 999, fontSize: 12 }}>
                  {t}<button onClick={() => up('tags', d.tags.filter(x => x !== t))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#7a6a4f' }}>✕</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
