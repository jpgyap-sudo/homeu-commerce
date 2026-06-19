export const dynamic = 'force-dynamic'

/**
 * Admin Media List Page
 *
 * Server component that displays a paginated, searchable grid of media
 * from the `media` table with image thumbnails.
 *
 * Uses `@/lib/db` helpers directly.
 */

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import Link from 'next/link'
import MediaSyncButton from './MediaSyncButton'

// ── Types ────────────────────────────────────────────────────────────

interface MediaRow {
  id: number
  filename: string | null
  alt: string | null
  mime_type: string | null
  filesize: number | null
  width: number | null
  height: number | null
  url: string | null
  source: string | null
  used_count: number | null
  created_at: string
  updated_at: string
}

interface ListPageProps {
  searchParams: Promise<{
    search?: string
    page?: string
    source?: string
  }>
}

const SOURCE_FILTERS: { key: string; label: string; icon: string }[] = [
  { key: '',          label: 'All',          icon: '▦' },
  { key: 'product',   label: 'Products',     icon: '🛋️' },
  { key: 'article',   label: 'Blog',         icon: '✍️' },
  { key: 'theme',     label: 'Theme',        icon: '🎨' },
  { key: 'brand',     label: 'Brand',        icon: '🏷️' },
  { key: 'unused',    label: 'Unused',       icon: '🗑️' },
]

const SOURCE_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  product: { label: 'Product', bg: '#eef5f0', fg: '#1e7a47' },
  article: { label: 'Blog',    bg: '#f0eefb', fg: '#5b46b3' },
  theme:   { label: 'Theme',   bg: '#fbf4e8', fg: '#9a6a16' },
  brand:   { label: 'Brand',   bg: '#fdeef0', fg: '#b0392f' },
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Page Component ───────────────────────────────────────────────────

export default async function AdminMediaListPage({ searchParams }: ListPageProps) {
  // Auth check
  const session = await getSession()
  if (!session) {
    redirect('/admin/login')
  }

  const sp = await searchParams
  const search = (sp.search || '').trim()
  const source = (sp.source || '').trim()
  const currentPage = Math.max(1, parseInt(sp.page || '1', 10) || 1)
  const limit = 24
  const offset = (currentPage - 1) * limit

  // ── Build WHERE clause ─────────────────────────────────────────
  const conditions: string[] = []
  const values: any[] = []
  let idx = 0

  if (search) {
    idx++
    conditions.push(
      `(LOWER(COALESCE(filename,'')) LIKE LOWER($${idx}) OR LOWER(COALESCE(alt,'')) LIKE LOWER($${idx}))`
    )
    values.push(`%${search}%`)
  }

  if (source === 'unused') {
    conditions.push(`COALESCE(used_count, 0) = 0`)
  } else if (source) {
    idx++
    conditions.push(`source = $${idx}`)
    values.push(source)
  }

  const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // ── Per-source counts for the filter chips ─────────────────────
  const sourceCounts: Record<string, number> = {}
  try {
    const cRes = await query(
      `SELECT source, COUNT(*)::int AS n, COUNT(*) FILTER (WHERE COALESCE(used_count,0)=0)::int AS unused FROM media GROUP BY source`,
      []
    )
    let unused = 0
    for (const r of cRes.rows) { sourceCounts[r.source || 'other'] = r.n; unused += r.unused }
    sourceCounts['unused'] = unused
  } catch { /* ignore */ }

  // ── Fetch total count ──────────────────────────────────────────
  let total = 0
  try {
    const countRes = await query(
      `SELECT COUNT(*) as total FROM media ${whereSQL}`,
      values
    )
    total = parseInt(countRes.rows[0]?.total || '0', 10)
  } catch {
    total = 0
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  // ── Fetch media ────────────────────────────────────────────────
  let media: MediaRow[] = []
  try {
    const mediaRes = await query(
      `SELECT * FROM media ${whereSQL} ORDER BY created_at DESC LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...values, limit, offset]
    )
    media = mediaRes.rows as MediaRow[]
  } catch {
    media = []
  }

  // ── Build pagination range ─────────────────────────────────────
  const paginationRange = buildPagination(currentPage, totalPages)

  // ── Render ─────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 1200, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 32, flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#151a17' }}>Media Library</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>
            {total} file{total !== 1 ? 's' : ''} in library
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <MediaSyncButton />
          <Link
            href="/admin/media/new"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 24px',
              background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)',
              color: '#fff',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(26,109,62,0.35)',
            }}
          >
            + Upload Media
          </Link>
        </div>
      </div>

      {/* Source filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {SOURCE_FILTERS.map(f => {
          const active = source === f.key
          const count = f.key === '' ? null : (sourceCounts[f.key] ?? 0)
          const params = new URLSearchParams()
          if (search) params.set('search', search)
          if (f.key) params.set('source', f.key)
          return (
            <Link
              key={f.key || 'all'}
              href={`/admin/media${params.toString() ? `?${params}` : ''}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                textDecoration: 'none',
                background: active ? '#1a6d3e' : '#fff',
                color: active ? '#fff' : '#3a4339',
                border: active ? 'none' : '1.5px solid #d9e0d7',
              }}
            >
              <span>{f.icon}</span>{f.label}
              {count != null && <span style={{ opacity: 0.7 }}>({count})</span>}
            </Link>
          )
        })}
      </div>

      {/* Search */}
      <form
        method="GET"
        action="/admin/media"
        style={{
          display: 'flex', gap: 12, marginBottom: 24,
          flexWrap: 'wrap', alignItems: 'center',
        }}
      >
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by filename or alt text..."
          style={{
            flex: '1 1 260px',
            padding: '10px 14px',
            border: '1.5px solid #d9e0d7',
            borderRadius: 10,
            fontSize: 14,
            fontFamily: 'inherit',
            outline: 'none',
            background: '#f7f9f6',
            color: '#151a17',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            background: '#151a17',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Search
        </button>
        {search && (
          <Link
            href="/admin/media"
            style={{
              padding: '10px 16px',
              color: '#667168',
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Clear
          </Link>
        )}
      </form>

      {/* Media Grid */}
      {media.length === 0 ? (
        <div style={{
          background: '#fff',
          border: '1px solid #d9e0d7',
          borderRadius: 12,
          padding: 60,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 18, color: '#667168', marginBottom: 8 }}>No media found</p>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 24 }}>
            {search
              ? 'Try adjusting your search criteria.'
              : 'Upload your first image or file.'}
          </p>
          <Link
            href="/admin/media/new"
            style={{
              padding: '10px 24px',
              background: '#151a17',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Upload Media
          </Link>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}>
            {media.map(item => (
              <Link
                key={item.id}
                href={`/admin/media/${item.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  background: '#fff',
                  border: '1px solid #d9e0d7',
                  borderRadius: 12,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                className="media-card"
              >
                {/* Thumbnail */}
                <div style={{
                  width: '100%',
                  height: 160,
                  background: '#f7f9f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {item.url ? (
                    <img
                      src={item.url}
                      alt={item.alt || item.filename || 'Media'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <span style={{ fontSize: 32, color: '#ccc' }}>🖼</span>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#151a17',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.filename || 'Untitled'}
                  </div>
                  <div style={{ fontSize: 11, color: '#667168', marginTop: 4 }}>
                    {item.mime_type || '—'} · {formatFileSize(item.filesize)}
                    {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {item.source && SOURCE_BADGE[item.source] && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                        background: SOURCE_BADGE[item.source].bg, color: SOURCE_BADGE[item.source].fg,
                      }}>{SOURCE_BADGE[item.source].label}</span>
                    )}
                    {(item.used_count ?? 0) > 0 ? (
                      <span style={{ fontSize: 10, color: '#667168' }}>used in {item.used_count}</span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#f3eee2', color: '#9a6a16' }}>unused</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: 4, marginTop: 24, flexWrap: 'wrap',
            }}>
              <PaginationLink
                page={currentPage - 1}
                label="← Prev"
                disabled={currentPage <= 1}
                search={search}
              />
              {paginationRange.map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} style={{ padding: '6px 8px', color: '#667168', fontSize: 14 }}>…</span>
                ) : (
                  <PaginationLink
                    key={p}
                    page={p}
                    label={String(p)}
                    active={p === currentPage}
                    search={search}
                  />
                )
              )}
              <PaginationLink
                page={currentPage + 1}
                label="Next →"
                disabled={currentPage >= totalPages}
                search={search}
              />
            </div>
          )}
        </>
      )}

      {/* Back */}
      <p style={{ marginTop: 32, textAlign: 'center' }}>
        <Link href="/admin/dashboard" style={{ color: '#667168', fontSize: 14 }}>
          &larr; Back to Dashboard
        </Link>
      </p>
    </main>
  )
}

// ── Sub-components ───────────────────────────────────────────────────

function buildPagination(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  if (total > 1) pages.push(total)
  return pages
}

function PaginationLink({
  page, label, disabled = false, active = false, search,
}: {
  page: number; label: string; disabled?: boolean; active?: boolean;
  search: string;
}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('page', String(page))
  const href = `/admin/media?${params.toString()}`

  const baseStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: active ? 700 : 400,
    textDecoration: 'none',
    color: active ? '#fff' : '#151a17',
    background: active ? '#1a6d3e' : 'transparent',
    border: active ? 'none' : '1px solid #d9e0d7',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 150ms ease',
  }

  if (disabled) {
    return <span style={baseStyle}>{label}</span>
  }

  return <Link href={href} style={baseStyle}>{label}</Link>
}
